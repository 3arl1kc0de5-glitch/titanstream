import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MetricsService } from '../metrics/metrics.service';
import { LedgerEntryType, RiskSeverity, RiskEventStatus } from '@prisma/client';

export interface ReconciliationReport {
  timestamp: string;
  totalTransactionGroupsChecked: number;
  imbalancedGroupCount: number;
  imbalancedGroups: Array<{
    groupId: string;
    reference: string;
    totalCredit: string;
    totalDebit: string;
    difference: string;
  }>;
}

@Injectable()
export class LedgerReconciliationSweeperService {
  private readonly logger = new Logger(LedgerReconciliationSweeperService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Perform double-entry audit sweep across all transaction groups.
   * Verifies that for every TransactionGroup, Sum(CREDIT) === Sum(DEBIT).
   */
  async runAuditSweep(): Promise<ReconciliationReport> {
    this.logger.log('[LedgerSweeper] Starting automated double-entry ledger reconciliation sweep...');

    const groups = await this.prisma.transactionGroup.findMany({
      take: 500,
      orderBy: { createdAt: 'desc' },
      include: {
        ledgerEntries: {
          select: {
            entryType: true,
            amount: true,
          },
        },
      },
    });

    const imbalancedGroups: ReconciliationReport['imbalancedGroups'] = [];

    for (const group of groups) {
      let totalCredit = 0;
      let totalDebit = 0;

      for (const entry of group.ledgerEntries) {
        const amt = Number(entry.amount);
        if (entry.entryType === LedgerEntryType.CREDIT) {
          totalCredit += amt;
        } else if (entry.entryType === LedgerEntryType.DEBIT) {
          totalDebit += amt;
        }
      }

      const diff = Math.abs(totalCredit - totalDebit);

      // Double-entry accounting invariant: total credits must equal total debits
      if (diff > 0.000001) {
        this.logger.error(
          `[LedgerSweeper] CRITICAL LEDGER IMBALANCE DETECTED for Group ${group.id} (ref: ${group.reference})! ` +
            `Credits=${totalCredit}, Debits=${totalDebit}, Diff=${diff}`,
        );

        imbalancedGroups.push({
          groupId: group.id,
          reference: group.reference,
          totalCredit: totalCredit.toFixed(6),
          totalDebit: totalDebit.toFixed(6),
          difference: (totalCredit - totalDebit).toFixed(6),
        });

        // Create CRITICAL RiskEvent
        await this.prisma.riskEvent.create({
          data: {
            entityType: 'TRANSACTION_GROUP',
            entityId: group.id,
            ruleTriggered: 'LEDGER_TRANSACTION_GROUP_IMBALANCE',
            severity: RiskSeverity.CRITICAL,
            status: RiskEventStatus.OPEN,
            notes: `Double-entry imbalance: Credits=${totalCredit.toFixed(6)}, Debits=${totalDebit.toFixed(6)}, Reference=${group.reference}`,
          },
        });
      }
    }

    // Update Prometheus gauge
    this.metricsService.setLedgerDrift(imbalancedGroups.length);

    this.logger.log(
      `[LedgerSweeper] Sweep complete. Checked ${groups.length} groups. Found ${imbalancedGroups.length} imbalances.`,
    );

    return {
      timestamp: new Date().toISOString(),
      totalTransactionGroupsChecked: groups.length,
      imbalancedGroupCount: imbalancedGroups.length,
      imbalancedGroups,
    };
  }
}
