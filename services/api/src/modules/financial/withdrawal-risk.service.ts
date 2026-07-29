import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Prisma, UserState } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UserLevelService } from '../growth/user-level.service';

export interface WithdrawalRiskEvaluation {
  allowed: boolean;
  requiresManualReview: boolean;
  userTier: string;
  dailyLimitUsd: number;
  remainingDailyLimitUsd: number;
  riskReason?: string;
}

@Injectable()
export class WithdrawalRiskService {
  private readonly logger = new Logger(WithdrawalRiskService.name);
  private readonly MANUAL_REVIEW_SINGLE_THRESHOLD = 1000;
  private readonly MANUAL_REVIEW_DAILY_THRESHOLD = 2500;

  constructor(
    private readonly prisma: PrismaService,
    private readonly userLevelService: UserLevelService,
  ) {}

  async evaluateWithdrawal(telegramUserId: bigint, amount: number): Promise<WithdrawalRiskEvaluation> {
    // 1. Check emergency system pause flag
    const emergencyState = await this.prisma.emergencyControlState.findUnique({
      where: { id: 'SYSTEM_EMERGENCY_STATE' },
    });
    if (emergencyState?.withdrawalsPaused) {
      throw new ForbiddenException('WITHDRAWALS_TEMPORARILY_PAUSED');
    }

    // 2. Validate User State
    const user = await this.prisma.user.findUnique({ where: { telegramUserId } });
    if (!user) throw new BadRequestException('USER_NOT_FOUND');
    if (user.state === UserState.SUSPENDED_USER || user.state === UserState.DELETED_USER) {
      throw new ForbiddenException('USER_ACCOUNT_SUSPENDED');
    }

    // 3. User Level & Limits
    let dailyLimitUsd = 1000;
    let userTier = 'Tier 1';
    try {
      const summary: any = await this.userLevelService.getUserLevelSummary(telegramUserId);
      userTier = summary.levelName;
      dailyLimitUsd = summary.dailyLimit || 1000;
    } catch {
      // default
    }

    // 4. Calculate Past 24h Payouts
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const past24hPayouts = await this.prisma.settlementSession.findMany({
      where: {
        telegramUserId,
        createdAt: { gte: since24h },
        status: { notIn: ['CANCELLED', 'REJECTED', 'FAILED', 'EXPIRED'] },
      },
    });

    const sum24h = past24hPayouts.reduce((acc, s) => acc + Number(s.requestedAmount), 0);
    const remainingDailyLimitUsd = Math.max(0, dailyLimitUsd - sum24h);

    if (amount > remainingDailyLimitUsd) {
      throw new BadRequestException(
        `DAILY_WITHDRAWAL_LIMIT_EXCEEDED: Requested $${amount}, remaining daily capacity is $${remainingDailyLimitUsd.toFixed(2)}`,
      );
    }

    // 5. Determine Manual Admin Review Trigger
    const isHighSingleAmount = amount >= this.MANUAL_REVIEW_SINGLE_THRESHOLD;
    const isHighCumulative = sum24h + amount >= this.MANUAL_REVIEW_DAILY_THRESHOLD;
    const requiresManualReview = isHighSingleAmount || isHighCumulative;

    return {
      allowed: true,
      requiresManualReview,
      userTier,
      dailyLimitUsd,
      remainingDailyLimitUsd,
      riskReason: requiresManualReview
        ? isHighSingleAmount
          ? 'HIGH_SINGLE_AMOUNT'
          : 'HIGH_24H_CUMULATIVE_VOLUME'
        : undefined,
    };
  }
}
