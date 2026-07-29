import { Injectable } from '@nestjs/common';
import { SettlementStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

export interface SlaTargetThresholds {
  maxTimeWaitingSeconds: number; // e.g. 60s
  maxMerchantResponseSeconds: number; // e.g. 300s
  maxPaymentConfirmationSeconds: number; // e.g. 120s
  maxCryptoDeliverySeconds: number; // e.g. 60s
  maxTotalFulfillmentSeconds: number; // e.g. 600s
}

export const DEFAULT_SLA_TARGETS: SlaTargetThresholds = {
  maxTimeWaitingSeconds: 60,
  maxMerchantResponseSeconds: 300,
  maxPaymentConfirmationSeconds: 120,
  maxCryptoDeliverySeconds: 60,
  maxTotalFulfillmentSeconds: 600,
};

@Injectable()
export class SettlementObservabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateSlaMetrics(timeframeDays = 7) {
    const sinceDate = new Date(Date.now() - timeframeDays * 24 * 60 * 60 * 1000);
    const sessions = await this.prisma.settlementSession.findMany({
      where: {
        createdAt: { gte: sinceDate },
      },
    });

    const completed = sessions.filter((s) => s.status === SettlementStatus.COMPLETED);

    let totalWaitingSec = 0;
    let totalMerchantRespSec = 0;
    let totalPayConfirmSec = 0;
    let totalCryptoDeliverySec = 0;
    let totalFulfillmentSec = 0;

    let waitingBreaches = 0;
    let merchantBreaches = 0;
    let payConfirmBreaches = 0;
    let cryptoDeliveryBreaches = 0;
    let totalSlaBreaches = 0;

    for (const session of completed) {
      const created = session.createdAt.getTime();
      const assigned = session.merchantAssignedAt ? session.merchantAssignedAt.getTime() : created;
      const paymentRec = session.paymentReceivedAt ? session.paymentReceivedAt.getTime() : assigned;
      const usdtSent = session.usdtSentAt ? session.usdtSentAt.getTime() : paymentRec;
      const completedAt = session.completedAt ? session.completedAt.getTime() : usdtSent;

      const timeWaitingSec = Math.max(0, Math.round((assigned - created) / 1000));
      const merchantRespSec = Math.max(0, Math.round((paymentRec - assigned) / 1000));
      const payConfirmSec = Math.max(0, Math.round((usdtSent - paymentRec) / 1000));
      const cryptoDeliverySec = Math.max(0, Math.round((completedAt - usdtSent) / 1000));
      const totalFulfilledSec = Math.max(0, Math.round((completedAt - created) / 1000));

      totalWaitingSec += timeWaitingSec;
      totalMerchantRespSec += merchantRespSec;
      totalPayConfirmSec += payConfirmSec;
      totalCryptoDeliverySec += cryptoDeliverySec;
      totalFulfillmentSec += totalFulfilledSec;

      if (timeWaitingSec > DEFAULT_SLA_TARGETS.maxTimeWaitingSeconds) waitingBreaches++;
      if (merchantRespSec > DEFAULT_SLA_TARGETS.maxMerchantResponseSeconds) merchantBreaches++;
      if (payConfirmSec > DEFAULT_SLA_TARGETS.maxPaymentConfirmationSeconds) payConfirmBreaches++;
      if (cryptoDeliverySec > DEFAULT_SLA_TARGETS.maxCryptoDeliverySeconds) cryptoDeliveryBreaches++;
      if (totalFulfilledSec > DEFAULT_SLA_TARGETS.maxTotalFulfillmentSeconds) totalSlaBreaches++;
    }

    const count = completed.length || 1;

    return {
      timeframe_days: timeframeDays,
      total_completed_sessions: completed.length,
      average_durations_seconds: {
        time_waiting: Math.round(totalWaitingSec / count),
        merchant_response_time: Math.round(totalMerchantRespSec / count),
        payment_confirmation_time: Math.round(totalPayConfirmSec / count),
        crypto_delivery_time: Math.round(totalCryptoDeliverySec / count),
        total_fulfillment_time: Math.round(totalFulfillmentSec / count),
      },
      sla_targets_seconds: DEFAULT_SLA_TARGETS,
      sla_breach_counts: {
        waiting_delay: waitingBreaches,
        merchant_response_delay: merchantBreaches,
        payment_confirm_delay: payConfirmBreaches,
        crypto_delivery_delay: cryptoDeliveryBreaches,
        total_sla_breaches: totalSlaBreaches,
      },
      sla_compliance_rate: `${(((completed.length - totalSlaBreaches) / count) * 100).toFixed(1)}%`,
    };
  }

  async detectBottlenecks() {
    const metrics = await this.calculateSlaMetrics(7);
    const avgs = metrics.average_durations_seconds;
    const bottlenecks: Array<{ phase: string; severity: string; message: string; avgSeconds: number; targetSeconds: number }> = [];

    if (avgs.time_waiting > DEFAULT_SLA_TARGETS.maxTimeWaitingSeconds) {
      bottlenecks.push({
        phase: 'TIME_WAITING',
        severity: 'HIGH',
        message: 'Operator assignment queue latency exceeds target threshold.',
        avgSeconds: avgs.time_waiting,
        targetSeconds: DEFAULT_SLA_TARGETS.maxTimeWaitingSeconds,
      });
    }

    if (avgs.merchant_response_time > DEFAULT_SLA_TARGETS.maxMerchantResponseSeconds) {
      bottlenecks.push({
        phase: 'MERCHANT_RESPONSE',
        severity: 'HIGH',
        message: 'Merchant fulfillment delay is slowing down session completions.',
        avgSeconds: avgs.merchant_response_time,
        targetSeconds: DEFAULT_SLA_TARGETS.maxMerchantResponseSeconds,
      });
    }

    if (avgs.payment_confirmation_time > DEFAULT_SLA_TARGETS.maxPaymentConfirmationSeconds) {
      bottlenecks.push({
        phase: 'PAYMENT_CONFIRMATION',
        severity: 'MEDIUM',
        message: 'Verification phase duration is longer than expected.',
        avgSeconds: avgs.payment_confirmation_time,
        targetSeconds: DEFAULT_SLA_TARGETS.maxPaymentConfirmationSeconds,
      });
    }

    return {
      active_bottlenecks_count: bottlenecks.length,
      bottlenecks,
      system_health_status: bottlenecks.length === 0 ? 'OPTIMAL' : bottlenecks.some((b) => b.severity === 'HIGH') ? 'DEGRADED' : 'WARNING',
    };
  }

  async getMerchantRankings() {
    const merchants = await this.prisma.merchantProfile.findMany({
      where: { status: 'ACTIVE' },
      include: { metrics: { orderBy: { updatedAt: 'desc' }, take: 1 } },
    });

    const ranked = merchants
      .map((m) => ({
        merchant_id: m.id,
        display_name: m.displayName,
        country: m.country,
        trust_score: m.trustScore,
        completion_rate: m.completionRate,
        avg_completion_time_seconds: m.averageCompletionTimeSeconds,
      }))
      .sort((a, b) => b.trust_score - a.trust_score || a.avg_completion_time_seconds - b.avg_completion_time_seconds);

    return {
      active_merchants_count: ranked.length,
      rankings: ranked,
    };
  }
}
