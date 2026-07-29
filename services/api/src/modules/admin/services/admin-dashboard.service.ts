import { Injectable } from '@nestjs/common';
import { MerchantStatus, RiskEventStatus, SettlementStatus, SupportStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardOverview() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      activeUsers,
      activeMerchants,
      pendingSettlements,
      completedSettlements,
      failedSettlements,
      disputedSettlements,
      volumeAggregate,
      awaitingPayment,
      awaitingMerchantAction,
      verificationRequired,
      riskReview,
      supportCases,
    ] = await Promise.all([
      this.prisma.user.count({ where: { lastActiveAt: { gte: thirtyDaysAgo } } }),
      this.prisma.merchantProfile.count({ where: { status: MerchantStatus.ACTIVE } }),
      this.prisma.settlementSession.count({
        where: {
          status: {
            in: [
              SettlementStatus.CREATED,
              SettlementStatus.INITIALIZED,
              SettlementStatus.OPERATOR_ASSIGNED,
              SettlementStatus.MERCHANT_ASSIGNED,
              SettlementStatus.WAITING_FOR_PAYMENT,
              SettlementStatus.WAITING_PAYMENT,
              SettlementStatus.VERIFYING,
            ],
          },
        },
      }),
      this.prisma.settlementSession.count({ where: { status: SettlementStatus.COMPLETED } }),
      this.prisma.settlementSession.count({
        where: { status: { in: [SettlementStatus.FAILED, SettlementStatus.EXPIRED, SettlementStatus.REJECTED] } },
      }),
      this.prisma.settlementSession.count({ where: { status: SettlementStatus.DISPUTED } }),
      this.prisma.settlementSession.aggregate({
        where: { status: SettlementStatus.COMPLETED },
        _sum: { expectedCryptoAmount: true },
      }),
      this.prisma.settlementSession.count({
        where: { status: { in: [SettlementStatus.WAITING_FOR_PAYMENT, SettlementStatus.WAITING_PAYMENT] } },
      }),
      this.prisma.settlementSession.count({
        where: { status: { in: [SettlementStatus.OPERATOR_ASSIGNED, SettlementStatus.MERCHANT_ASSIGNED] } },
      }),
      this.prisma.settlementSession.count({ where: { status: SettlementStatus.VERIFYING } }),
      this.prisma.riskEvent.count({ where: { status: { in: [RiskEventStatus.OPEN, RiskEventStatus.UNDER_REVIEW] } } }),
      this.prisma.supportCase.count({ where: { status: { in: [SupportStatus.OPEN, SupportStatus.ASSIGNED] } } }),
    ]);

    const [pendingMerchants, pausedMerchants, suspendedMerchants, expiredCount, rejectedCount, failedCount] = await Promise.all([
      this.prisma.merchantProfile.count({ where: { status: MerchantStatus.PENDING } }),
      this.prisma.merchantProfile.count({ where: { status: MerchantStatus.PAUSED } }),
      this.prisma.merchantProfile.count({ where: { status: MerchantStatus.SUSPENDED } }),
      this.prisma.settlementSession.count({ where: { status: SettlementStatus.EXPIRED } }),
      this.prisma.settlementSession.count({ where: { status: SettlementStatus.REJECTED } }),
      this.prisma.settlementSession.count({ where: { status: SettlementStatus.FAILED } }),
    ]);

    return {
      system_overview: {
        active_users: activeUsers,
        active_merchants: activeMerchants,
        pending_settlements: pendingSettlements,
        completed_settlements: completedSettlements,
        failed_settlements: failedSettlements,
        disputed_settlements: disputedSettlements,
        transaction_volume: volumeAggregate._sum.expectedCryptoAmount?.toString() || '0',
      },
      operational_queues: {
        awaiting_payment: awaitingPayment,
        awaiting_merchant_action: awaitingMerchantAction,
        verification_required: verificationRequired,
        risk_review: riskReview,
        support_cases: supportCases,
      },
      provider_health: [
        { provider_id: 'MERCHANT_MOBILE_MONEY', name: 'Merchant Mobile Money', status: 'HEALTHY', enabled: true },
        { provider_id: 'CRYPTOBOT', name: 'CryptoBot Settlement', status: 'HEALTHY', enabled: true },
      ],
      merchant_pool_status: {
        active: activeMerchants,
        pending: pendingMerchants,
        paused: pausedMerchants,
        suspended: suspendedMerchants,
      },
      failed_transaction_analysis: {
        expired: expiredCount,
        rejected: rejectedCount,
        failed: failedCount,
      },
    };
  }
}
