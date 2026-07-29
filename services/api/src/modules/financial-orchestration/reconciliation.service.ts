import { Injectable, Logger } from '@nestjs/common';
import { Prisma, ReconciliationRunStatus, LedgerEntryType, RiskSeverity, RiskEventStatus, PaymentInvoiceStatus, SettlementStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MetricsService } from '../metrics/metrics.service';

export interface ComprehensiveReconciliationReport {
  runId: string;
  source: string;
  startedAt: string;
  completedAt: string;
  status: ReconciliationRunStatus;
  summary: {
    totalCheckpoints: number;
    passedCheckpoints: number;
    failedCheckpoints: number;
    externalDepositDiscrepancies: number;
    ledgerImbalancedGroups: number;
    stuckOperationsCount: number;
  };
  details: {
    externalDepositMismatches: Array<{ externalInvoiceId: string; telegramUserId: string; amount: string }>;
    imbalancedGroups: Array<{ groupId: string; reference: string; difference: string }>;
    stuckOperations: Array<{ operationId: string; operationType: string; ageMinutes: number }>;
  };
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  createRun(source: string) {
    return this.prisma.reconciliationRun.create({
      data: { source, status: ReconciliationRunStatus.CREATED, startedAt: new Date() },
    });
  }

  addCheckpoint(runId: string, checkpoint: { subject: string; status: string; externalRef?: string; ledgerRef?: string; details?: Record<string, unknown> }) {
    return this.prisma.reconciliationCheckpoint.create({
      data: {
        runId,
        subject: checkpoint.subject,
        status: checkpoint.status,
        externalRef: checkpoint.externalRef,
        ledgerRef: checkpoint.ledgerRef,
        details: (checkpoint.details || {}) as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Execute full end-to-end financial reconciliation run.
   */
  async runFullReconciliation(source: string = 'AUTOMATED_SWEEPER'): Promise<ComprehensiveReconciliationReport> {
    const startedAt = new Date();
    const run = await this.createRun(source);
    await this.prisma.reconciliationRun.update({
      where: { id: run.id },
      data: { status: ReconciliationRunStatus.RUNNING },
    });

    this.logger.log(`[ReconciliationEngine] Started reconciliation run ${run.id} (Source: ${source})`);

    const externalDepositMismatches: ComprehensiveReconciliationReport['details']['externalDepositMismatches'] = [];
    const imbalancedGroups: ComprehensiveReconciliationReport['details']['imbalancedGroups'] = [];
    const stuckOperations: ComprehensiveReconciliationReport['details']['stuckOperations'] = [];

    let totalCheckpoints = 0;
    let passedCheckpoints = 0;
    let failedCheckpoints = 0;

    // 1. Audit External Deposits vs Ledger Allocations
    const paidInvoices = await this.prisma.paymentInvoice.findMany({
      where: { status: PaymentInvoiceStatus.PAID },
      take: 200,
    });

    for (const inv of paidInvoices) {
      totalCheckpoints++;
      const expectedRef = `cryptobot_inv_${inv.externalInvoiceId}`;
      const matchingOp = await this.prisma.financialOperation.findFirst({
        where: { reference: expectedRef },
      });

      if (!matchingOp) {
        failedCheckpoints++;
        this.logger.error(`[ReconciliationEngine] DISCREPANCY: Paid invoice ${inv.externalInvoiceId} has no financial operation!`);
        externalDepositMismatches.push({
          externalInvoiceId: inv.externalInvoiceId,
          telegramUserId: inv.telegramUserId.toString(),
          amount: inv.amount.toString(),
        });

        await this.addCheckpoint(run.id, {
          subject: 'EXTERNAL_DEPOSIT_MATCHING',
          status: 'DISCREPANCY',
          externalRef: inv.externalInvoiceId,
          details: { amount: inv.amount.toString(), telegramUserId: inv.telegramUserId.toString() },
        });

        await this.prisma.riskEvent.create({
          data: {
            entityType: 'PAYMENT_INVOICE',
            entityId: inv.id,
            ruleTriggered: 'UNRECONCILED_PAID_INVOICE',
            severity: RiskSeverity.CRITICAL,
            status: RiskEventStatus.OPEN,
            notes: `Paid invoice ${inv.externalInvoiceId} missing ledger operation`,
          },
        });
      } else {
        passedCheckpoints++;
        await this.addCheckpoint(run.id, {
          subject: 'EXTERNAL_DEPOSIT_MATCHING',
          status: 'MATCHED',
          externalRef: inv.externalInvoiceId,
          ledgerRef: matchingOp.id,
        });
      }
    }

    // 2. Audit Double-Entry Ledger Invariants (Credits == Debits)
    const groups = await this.prisma.transactionGroup.findMany({
      take: 200,
      orderBy: { createdAt: 'desc' },
      include: {
        ledgerEntries: {
          select: { entryType: true, amount: true },
        },
      },
    });

    for (const group of groups) {
      totalCheckpoints++;
      let totalCredit = 0;
      let totalDebit = 0;

      for (const entry of group.ledgerEntries) {
        const amt = Number(entry.amount);
        if (entry.entryType === LedgerEntryType.CREDIT) totalCredit += amt;
        if (entry.entryType === LedgerEntryType.DEBIT) totalDebit += amt;
      }

      const diff = Math.abs(totalCredit - totalDebit);
      if (diff > 0.000001) {
        failedCheckpoints++;
        imbalancedGroups.push({
          groupId: group.id,
          reference: group.reference,
          difference: (totalCredit - totalDebit).toFixed(6),
        });

        await this.addCheckpoint(run.id, {
          subject: 'LEDGER_DOUBLE_ENTRY_INVARIANT',
          status: 'IMBALANCED',
          ledgerRef: group.id,
          details: { reference: group.reference, totalCredit, totalDebit, diff },
        });

        await this.prisma.riskEvent.create({
          data: {
            entityType: 'TRANSACTION_GROUP',
            entityId: group.id,
            ruleTriggered: 'LEDGER_TRANSACTION_GROUP_IMBALANCE',
            severity: RiskSeverity.CRITICAL,
            status: RiskEventStatus.OPEN,
            notes: `Double-entry imbalance for ${group.reference}: diff=${diff}`,
          },
        });
      } else {
        passedCheckpoints++;
        await this.addCheckpoint(run.id, {
          subject: 'LEDGER_DOUBLE_ENTRY_INVARIANT',
          status: 'BALANCED',
          ledgerRef: group.id,
        });
      }
    }

    // 3. Audit Stuck Financial Operations
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const stuckOps = await this.prisma.financialOperation.findMany({
      where: {
        status: { in: ['REQUESTED', 'VALIDATED', 'AUTHORIZED', 'EXECUTING'] as any },
        createdAt: { lte: tenMinutesAgo },
      },
    });

    for (const op of stuckOps) {
      totalCheckpoints++;
      failedCheckpoints++;
      const ageMinutes = Math.floor((Date.now() - op.createdAt.getTime()) / (60 * 1000));
      stuckOperations.push({
        operationId: op.id,
        operationType: op.operationType,
        ageMinutes,
      });

      await this.addCheckpoint(run.id, {
        subject: 'STUCK_OPERATION_DETECTION',
        status: 'STUCK',
        ledgerRef: op.id,
        details: { operationType: op.operationType, ageMinutes },
      });
    }

    const completedAt = new Date();
    const isSuccess = failedCheckpoints === 0;
    const runStatus = isSuccess ? ReconciliationRunStatus.COMPLETED : ReconciliationRunStatus.FAILED;

    const summary = {
      totalCheckpoints,
      passedCheckpoints,
      failedCheckpoints,
      externalDepositDiscrepancies: externalDepositMismatches.length,
      ledgerImbalancedGroups: imbalancedGroups.length,
      stuckOperationsCount: stuckOperations.length,
    };

    await this.prisma.reconciliationRun.update({
      where: { id: run.id },
      data: {
        status: runStatus,
        completedAt,
        summary,
        failureReason: isSuccess ? null : `Found ${failedCheckpoints} financial reconciliation failures`,
      },
    });

    // Update Prometheus metrics
    this.metricsService.setLedgerDrift(imbalancedGroups.length + externalDepositMismatches.length);

    this.logger.log(`[ReconciliationEngine] Run ${run.id} finished with status ${runStatus}. (Failed: ${failedCheckpoints}/${totalCheckpoints})`);

    return {
      runId: run.id,
      source,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      status: runStatus,
      summary,
      details: {
        externalDepositMismatches,
        imbalancedGroups,
        stuckOperations,
      },
    };
  }

  /**
   * Fetch recent reconciliation runs for admin audit dashboards.
   */
  async getRecentRuns(limit = 20) {
    return this.prisma.reconciliationRun.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        checkpoints: {
          take: 10,
        },
      },
    });
  }
}
