import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SettlementEventType, SettlementStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { OperationalAuditService } from './operational-audit.service';

@Injectable()
export class MerchantPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: OperationalAuditService,
  ) {}

  async getAssignedSettlements(merchantId: string) {
    const sessions = await this.prisma.settlementSession.findMany({
      where: {
        operatorId: merchantId,
        status: {
          in: [
            SettlementStatus.OPERATOR_ASSIGNED,
            SettlementStatus.MERCHANT_ASSIGNED,
            SettlementStatus.WAITING_FOR_PAYMENT,
            SettlementStatus.WAITING_PAYMENT,
            SettlementStatus.VERIFYING,
          ],
        },
      },
      include: {
        user: { select: { telegramUsername: true, firstName: true, state: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((s) => ({
      ...s,
      telegramUserId: s.telegramUserId.toString(),
      requestedAmount: s.requestedAmount.toString(),
      expectedCryptoAmount: s.expectedCryptoAmount.toString(),
      exchangeRate: s.exchangeRate.toString(),
    }));
  }

  async fulfillSettlement(merchantId: string, settlementId: string, proofReference?: string) {
    const session = await this.prisma.settlementSession.findUnique({ where: { id: settlementId } });
    if (!session) throw new NotFoundException('SETTLEMENT_SESSION_NOT_FOUND');
    if (session.operatorId !== merchantId) {
      throw new BadRequestException('SETTLEMENT_NOT_ASSIGNED_TO_MERCHANT');
    }

    const now = new Date();
    const updated = await this.prisma.settlementSession.update({
      where: { id: settlementId },
      data: {
        status: SettlementStatus.VERIFYING,
        paymentReceivedAt: now,
        providerMetadata: {
          ...(typeof session.providerMetadata === 'object' ? session.providerMetadata : {}),
          merchantProofReference: proofReference || 'MERCHANT_CONFIRMED',
          fulfilledAt: now.toISOString(),
        },
      },
    });

    await this.prisma.settlementEvent.create({
      data: {
        settlementId,
        eventType: SettlementEventType.PaymentReceived,
        actorType: 'MERCHANT',
        actorId: merchantId,
        payload: { proofReference, fulfilledAt: now.toISOString() },
      },
    });

    await this.auditService.logAction({
      actorId: merchantId,
      actorRole: 'MERCHANT',
      action: 'MERCHANT_FULFILLED_SETTLEMENT',
      entity: 'SETTLEMENT',
      entityId: settlementId,
      metadata: { proofReference },
    });

    return {
      status: 'FULFILLED',
      settlementId,
      currentStatus: updated.status,
      paymentReceivedAt: now.toISOString(),
    };
  }

  async getSettlementHistory(merchantId: string, limit = 50, offset = 0) {
    const [items, total] = await Promise.all([
      this.prisma.settlementSession.findMany({
        where: {
          operatorId: merchantId,
          status: SettlementStatus.COMPLETED,
        },
        orderBy: { completedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.settlementSession.count({
        where: { operatorId: merchantId, status: SettlementStatus.COMPLETED },
      }),
    ]);

    return {
      items: items.map((s) => ({
        ...s,
        telegramUserId: s.telegramUserId.toString(),
        requestedAmount: s.requestedAmount.toString(),
        expectedCryptoAmount: s.expectedCryptoAmount.toString(),
      })),
      pagination: { total, limit, offset },
    };
  }

  async getMerchantPerformance(merchantId: string) {
    const merchant = await this.prisma.merchantProfile.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundException('MERCHANT_NOT_FOUND');

    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sessions = await this.prisma.settlementSession.findMany({
      where: { operatorId: merchantId, createdAt: { gte: since30d } },
    });

    const completed = sessions.filter((s) => s.status === 'COMPLETED').length;
    const total = sessions.length;
    const completionRate = total > 0 ? (completed / total) * 100 : 100;

    return {
      merchant_id: merchantId,
      display_name: merchant.displayName,
      country: merchant.country,
      status: merchant.status,
      trust_score: `${merchant.trustScore.toFixed(1)}%`,
      completion_rate: `${completionRate.toFixed(1)}%`,
      average_fulfillment_seconds: merchant.averageCompletionTimeSeconds,
      daily_limit_usd: merchant.dailyLimit.toString(),
      total_30d_sessions: total,
      completed_30d_sessions: completed,
    };
  }
}
