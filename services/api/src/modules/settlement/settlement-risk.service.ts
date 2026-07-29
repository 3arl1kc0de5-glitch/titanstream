import { BadRequestException, Injectable } from '@nestjs/common';
import { SettlementStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export interface RiskEvaluationResult {
  allowed: boolean;
  reason?: string;
  riskCode?: string;
  requiresManualReview?: boolean;
}

export const DEFAULT_RISK_LIMITS = {
  TIER_0_FIRST_TX_MAX_USD: 100,
  TIER_0_DAILY_MAX_USD: 250,
  TIER_1_SINGLE_MAX_USD: 1000,
  TIER_1_DAILY_MAX_USD: 2500,
  MAX_HOURLY_SESSIONS: 3,
  MAX_DAILY_SESSIONS: 5,
  RAPID_REQUEST_WINDOW_SEC: 30,
  MERCHANT_DAILY_MAX_USD: 5000,
  MERCHANT_MAX_ACTIVE_ASSIGNMENTS: 10,
};

@Injectable()
export class SettlementRiskService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluateUserRisk(telegramUserId: bigint, requestedAmountUsd: number): Promise<RiskEvaluationResult> {
    const completedCount = await this.prisma.settlementSession.count({
      where: {
        telegramUserId,
        status: SettlementStatus.COMPLETED,
      },
    });

    const isNewUser = completedCount === 0;
    const userTier = completedCount > 3 ? 1 : 0;

    // 1. Check First Settlement Limit ($100 for new user)
    if (isNewUser && requestedAmountUsd > DEFAULT_RISK_LIMITS.TIER_0_FIRST_TX_MAX_USD) {
      return {
        allowed: false,
        reason: `First settlement amount ($${requestedAmountUsd}) exceeds maximum limit for new users ($${DEFAULT_RISK_LIMITS.TIER_0_FIRST_TX_MAX_USD}).`,
        riskCode: 'FIRST_TX_LIMIT_EXCEEDED',
      };
    }

    // 2. Single transaction max limit
    const singleLimit = userTier === 0 ? DEFAULT_RISK_LIMITS.TIER_0_FIRST_TX_MAX_USD : DEFAULT_RISK_LIMITS.TIER_1_SINGLE_MAX_USD;
    if (requestedAmountUsd > singleLimit) {
      return {
        allowed: false,
        reason: `Single settlement amount ($${requestedAmountUsd}) exceeds user limit of $${singleLimit}.`,
        riskCode: 'SINGLE_TX_LIMIT_EXCEEDED',
      };
    }

    // 3. Daily 24-hour cumulative limit
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent24hSessions = await this.prisma.settlementSession.findMany({
      where: {
        telegramUserId,
        createdAt: { gte: since24h },
        status: { in: [SettlementStatus.COMPLETED, SettlementStatus.APPROVED, SettlementStatus.POSTED, SettlementStatus.USDT_SENT, SettlementStatus.PAYMENT_RECEIVED] },
      },
    });

    const dailyTotalUsd = recent24hSessions.reduce((acc, s) => acc + Number(s.expectedCryptoAmount), 0);
    const dailyLimit = userTier === 0 ? DEFAULT_RISK_LIMITS.TIER_0_DAILY_MAX_USD : DEFAULT_RISK_LIMITS.TIER_1_DAILY_MAX_USD;

    if (dailyTotalUsd + requestedAmountUsd > dailyLimit) {
      return {
        allowed: false,
        reason: `Cumulative 24-hour settlement amount ($${dailyTotalUsd + requestedAmountUsd}) exceeds daily user limit ($${dailyLimit}).`,
        riskCode: 'DAILY_LIMIT_EXCEEDED',
      };
    }

    // 4. Velocity Check - Hourly & Daily Session Creation Count
    const since1h = new Date(Date.now() - 60 * 60 * 1000);
    const hourlySessionCount = await this.prisma.settlementSession.count({
      where: { telegramUserId, createdAt: { gte: since1h } },
    });

    if (hourlySessionCount >= DEFAULT_RISK_LIMITS.MAX_HOURLY_SESSIONS) {
      return {
        allowed: false,
        reason: `Velocity limit exceeded: maximum ${DEFAULT_RISK_LIMITS.MAX_HOURLY_SESSIONS} settlements allowed per hour.`,
        riskCode: 'HOURLY_VELOCITY_EXCEEDED',
      };
    }

    const total24hCount = await this.prisma.settlementSession.count({
      where: { telegramUserId, createdAt: { gte: since24h } },
    });

    if (total24hCount >= DEFAULT_RISK_LIMITS.MAX_DAILY_SESSIONS) {
      return {
        allowed: false,
        reason: `Daily settlement session count limit (${DEFAULT_RISK_LIMITS.MAX_DAILY_SESSIONS}) exceeded.`,
        riskCode: 'DAILY_VELOCITY_EXCEEDED',
      };
    }

    // 5. Rapid Request Check (< 30 seconds)
    const latestSession = await this.prisma.settlementSession.findFirst({
      where: { telegramUserId },
      orderBy: { createdAt: 'desc' },
    });

    if (latestSession) {
      const secSinceLast = (Date.now() - latestSession.createdAt.getTime()) / 1000;
      if (secSinceLast < DEFAULT_RISK_LIMITS.RAPID_REQUEST_WINDOW_SEC) {
        return {
          allowed: false,
          reason: `Rapid session creation detected. Please wait at least ${DEFAULT_RISK_LIMITS.RAPID_REQUEST_WINDOW_SEC} seconds before creating another settlement request.`,
          riskCode: 'RAPID_SUBMISSION_BLOCKED',
        };
      }
    }

    return { allowed: true };
  }

  async evaluateMerchantCapacity(operatorId: string, requestedAmountUsd: number): Promise<RiskEvaluationResult> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const merchantCompleted24h = await this.prisma.settlementSession.findMany({
      where: {
        operatorId,
        createdAt: { gte: since24h },
        status: { in: [SettlementStatus.COMPLETED, SettlementStatus.APPROVED, SettlementStatus.POSTED, SettlementStatus.USDT_SENT] },
      },
    });

    const merchantDailyTotal = merchantCompleted24h.reduce((acc, s) => acc + Number(s.expectedCryptoAmount), 0);

    if (merchantDailyTotal + requestedAmountUsd > DEFAULT_RISK_LIMITS.MERCHANT_DAILY_MAX_USD) {
      return {
        allowed: false,
        reason: `Merchant daily processed volume capacity ($${DEFAULT_RISK_LIMITS.MERCHANT_DAILY_MAX_USD}) exceeded.`,
        riskCode: 'MERCHANT_DAILY_CAPACITY_EXCEEDED',
      };
    }

    const activeAssignments = await this.prisma.settlementSession.count({
      where: {
        operatorId,
        status: { in: [SettlementStatus.OPERATOR_ASSIGNED, SettlementStatus.MERCHANT_ASSIGNED, SettlementStatus.WAITING_FOR_PAYMENT, SettlementStatus.WAITING_PAYMENT, SettlementStatus.VERIFYING] },
      },
    });

    if (activeAssignments >= DEFAULT_RISK_LIMITS.MERCHANT_MAX_ACTIVE_ASSIGNMENTS) {
      return {
        allowed: false,
        reason: `Merchant maximum active concurrent assignments (${DEFAULT_RISK_LIMITS.MERCHANT_MAX_ACTIVE_ASSIGNMENTS}) exceeded.`,
        riskCode: 'MERCHANT_LOAD_EXCEEDED',
      };
    }

    return { allowed: true };
  }

  async assertSessionCreationRisk(telegramUserId: bigint, requestedAmountUsd: number): Promise<void> {
    const risk = await this.evaluateUserRisk(telegramUserId, requestedAmountUsd);
    if (!risk.allowed) {
      throw new BadRequestException(`SETTLEMENT_RISK_REJECTED: ${risk.reason}`);
    }
  }
}
