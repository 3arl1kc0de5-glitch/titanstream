import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { SettlementStatus, SettlementType } from '@prisma/client';

// ─── Production Monitoring Controller ────────────────────────────────────────
// Operational dashboards for settlement latency, provider availability,
// webhook failures, payment failures, pending queues, and merchant performance.

@ApiTags('Metrics')
@Controller('metrics')
export class MonitoringController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('settlement-latency')
  @ApiOperation({ summary: 'Average settlement completion time' })
  async getSettlementLatency() {
    const completed = await this.prisma.settlementSession.findMany({
      where: { status: SettlementStatus.COMPLETED, completedAt: { not: null } },
      select: { createdAt: true, completedAt: true },
      orderBy: { completedAt: 'desc' },
      take: 100,
    });

    if (completed.length === 0) {
      return { averageLatencyMs: 0, averageLatencyMinutes: 0, sampleSize: 0 };
    }

    const latencies = completed.map((s) => {
      const created = new Date(s.createdAt).getTime();
      const completed = s.completedAt ? new Date(s.completedAt).getTime() : created;
      return completed - created;
    });

    const avgMs = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    return {
      averageLatencyMs: Math.round(avgMs),
      averageLatencyMinutes: Math.round(avgMs / 60000 * 10) / 10,
      sampleSize: completed.length,
      p50Ms: latencies.sort((a, b) => a - b)[Math.floor(latencies.length / 2)],
      p95Ms: latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)],
    };
  }

  @Get('provider-health')
  @ApiOperation({ summary: 'Health status of all settlement providers' })
  async getProviderHealth() {
    const providers = await this.prisma.settlementProvider.findMany({
      include: { health: true },
    });
    return providers.map((p) => ({
      id: p.id,
      name: p.displayName,
      status: p.status,
      healthStatus: p.health?.healthStatus || 'UNKNOWN',
      lastChecked: p.health?.checkedAt || null,
    }));
  }

  @Get('webhook-failures')
  @ApiOperation({ summary: 'Recent webhook processing failures' })
  async getWebhookFailures() {
    const failures = await this.prisma.operationsQueueItem.findMany({
      where: { reason: { contains: 'WEBHOOK' } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      totalFailures: failures.length,
      recent: failures.map((f) => ({
        id: f.id,
        settlementId: f.settlementId,
        reason: f.reason,
        payload: f.payload,
        createdAt: f.createdAt,
      })),
    };
  }

  @Get('pending-queue')
  @ApiOperation({ summary: 'Pending settlements, invoices, and withdrawal queue' })
  async getPendingQueue() {
    const [pendingSettlements, pendingWithdrawals] = await Promise.all([
      this.prisma.settlementSession.count({
        where: {
          status: {
            in: [
              SettlementStatus.CREATED,
              SettlementStatus.INITIALIZED,
              SettlementStatus.OPERATOR_ASSIGNED,
              SettlementStatus.WAITING_FOR_PAYMENT,
              SettlementStatus.VERIFYING,
              SettlementStatus.PAYMENT_RECEIVED,
            ],
          },
        },
      }),
      this.prisma.settlementSession.count({
        where: {
          sessionType: SettlementType.PAYOUT,
          status: { in: [SettlementStatus.CREATED, SettlementStatus.INITIALIZED, SettlementStatus.OPERATOR_ASSIGNED, SettlementStatus.WAITING_FOR_PAYMENT, SettlementStatus.VERIFYING] },
        },
      }).catch(() => 0),
    ]);

    const operationsQueue = await this.prisma.operationsQueueItem.count();

    return {
      pendingSettlements,
      pendingWithdrawals,
      operationsQueue,
    };
  }

  @Get('merchant-performance')
  @ApiOperation({ summary: 'Merchant/operator performance metrics' })
  async getMerchantPerformance() {
    const operators = await this.prisma.operator.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        displayName: true,
        currentLoad: true,
        capacity: true,
        supportedMobileMoneyNetworks: true,
        status: true,
      },
    });
    return operators.map((op) => ({
      id: op.id,
      name: op.displayName,
      currentLoad: op.currentLoad,
      maxConcurrent: op.capacity,
      utilization: op.capacity > 0 ? Math.round((op.currentLoad / op.capacity) * 100) : 0,
      status: op.status,
      supportedNetworks: op.supportedMobileMoneyNetworks,
    }));
  }

  @Get('daily-summary')
  @ApiOperation({ summary: 'Daily financial summary — deposits, withdrawals, settlements' })
  async getDailySummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [completedToday, failedToday, totalSettlements] = await Promise.all([
      this.prisma.settlementSession.count({
        where: { status: SettlementStatus.COMPLETED, completedAt: { gte: today } },
      }),
      this.prisma.settlementSession.count({
        where: {
          status: { in: [SettlementStatus.REJECTED, SettlementStatus.EXPIRED, SettlementStatus.CANCELLED] },
          updatedAt: { gte: today },
        },
      }),
      this.prisma.settlementSession.count(),
    ]);

    return {
      completedToday,
      failedToday,
      totalSettlements,
      successRate: completedToday + failedToday > 0
        ? Math.round((completedToday / (completedToday + failedToday)) * 100)
        : 100,
      timestamp: new Date().toISOString(),
    };
  }
}
