import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { TreasuryService } from '../../treasury/treasury.service';
import { PaymentOrderService } from '../../payment-order/payment-order.service';
import { IncidentEngineService } from './incident-engine.service';
import { OperationsQueueStatus } from '@prisma/client';

export interface MissionControlOverview {
  system_health: {
    status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    database: 'UP' | 'DOWN';
    api: 'UP' | 'DOWN';
    treasury_reserve: 'HEALTHY' | 'WATCH' | 'CRITICAL';
    worker_queue: 'HEALTHY' | 'DEGRADED';
  };
  operational_queues: {
    payment_orders_pending: number;
    payment_orders_verification: number;
    operations_queue_open: number;
    risk_events_open: number;
    active_incidents: number;
    support_cases_open: number;
  };
  financial_summary: {
    total_liquidity_usdt: number;
    user_liabilities_usdt: number;
    reserve_ratio_percent: number;
    projected_payouts_usdt: number;
  };
  capacity_summary: {
    total_capacity_ghs: number;
    active_nodes: number;
    capacity_utilization_percent: number;
  };
  active_incidents: any[];
  recent_audit_trail: any[];
}

@Injectable()
export class OperationsService {
  private readonly logger = new Logger(OperationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly treasuryService: TreasuryService,
    private readonly paymentOrderService: PaymentOrderService,
    private readonly incidentEngine: IncidentEngineService,
  ) {}

  async getMissionControlOverview(): Promise<MissionControlOverview> {
    const treasuryMetrics = await this.treasuryService.getMetrics();
    const allPaymentOrders = this.paymentOrderService.getAllOrders();

    const pendingOrdersCount = allPaymentOrders.filter((o) => o.status === 'AWAITING_PAYMENT').length;
    const verificationOrdersCount = allPaymentOrders.filter((o) => o.status === 'AWAITING_VERIFICATION').length;

    const [openQueueCount, openRiskCount, openSupportCount, recentAuditEvents] = await Promise.all([
      this.prisma.operationsQueueItem.count({ where: { status: OperationsQueueStatus.OPEN } }).catch(() => 0),
      this.prisma.riskEvent.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }).catch(() => 0),
      this.prisma.supportCase.count({ where: { status: { in: ['OPEN', 'ASSIGNED'] } } }).catch(() => 0),
      this.prisma.auditEvent.findMany({
        take: 15,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          eventType: true,
          description: true,
          createdAt: true,
          telegramUserId: true,
        },
      }).catch(() => []),
    ]);

    const activeIncidents = this.incidentEngine.getActiveIncidents();

    let systemStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';
    if (treasuryMetrics.healthStatus === 'CRITICAL' || activeIncidents.some((i) => i.severity === 'CRITICAL')) {
      systemStatus = 'CRITICAL';
    } else if (treasuryMetrics.healthStatus === 'DEGRADED' || activeIncidents.length > 0 || openQueueCount > 5) {
      systemStatus = 'DEGRADED';
    }

    return {
      system_health: {
        status: systemStatus,
        database: 'UP',
        api: 'UP',
        treasury_reserve: treasuryMetrics.healthStatus === 'CRITICAL' ? 'CRITICAL' : treasuryMetrics.healthStatus === 'DEGRADED' ? 'WATCH' : 'HEALTHY',
        worker_queue: openQueueCount > 10 ? 'DEGRADED' : 'HEALTHY',
      },
      operational_queues: {
        payment_orders_pending: pendingOrdersCount,
        payment_orders_verification: verificationOrdersCount,
        operations_queue_open: openQueueCount,
        risk_events_open: openRiskCount,
        active_incidents: activeIncidents.length,
        support_cases_open: openSupportCount,
      },
      financial_summary: {
        total_liquidity_usdt: treasuryMetrics.totalLiquidity,
        user_liabilities_usdt: treasuryMetrics.userLiabilities,
        reserve_ratio_percent: treasuryMetrics.reserveRatio,
        projected_payouts_usdt: treasuryMetrics.projectedPayouts,
      },
      capacity_summary: {
        total_capacity_ghs: 2500.0,
        active_nodes: 148,
        capacity_utilization_percent: Math.round(100 - treasuryMetrics.capacityRemaining),
      },
      active_incidents: activeIncidents,
      recent_audit_trail: recentAuditEvents,
    };
  }

  async getOperationsQueue() {
    return this.prisma.operationsQueueItem.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async resolveQueueItem(id: string, note?: string) {
    const item = await this.prisma.operationsQueueItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('QUEUE_ITEM_NOT_FOUND');

    return this.prisma.operationsQueueItem.update({
      where: { id },
      data: {
        status: OperationsQueueStatus.RESOLVED,
        resolvedAt: new Date(),
        payload: {
          ...(typeof item.payload === 'object' ? item.payload : {}),
          resolutionNote: note || 'Resolved by operator',
        },
      },
    });
  }

  async retryQueueItem(id: string) {
    const item = await this.prisma.operationsQueueItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('QUEUE_ITEM_NOT_FOUND');

    this.logger.log(`Re-triggering operations queue item ${id} (${item.reason})`);
    return this.prisma.operationsQueueItem.update({
      where: { id },
      data: {
        status: OperationsQueueStatus.OPEN,
        resolvedAt: null,
      },
    });
  }
}
