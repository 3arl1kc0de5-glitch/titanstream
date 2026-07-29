import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FinancialOperationStatus } from '@prisma/client';

@Injectable()
export class MetricsService {
  private transactionCounter = new Map<string, number>();
  private settlementCounter = new Map<string, number>();
  private httpRequestsCounter = new Map<string, number>();
  private ledgerDriftGauge = 0;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a financial transaction execution.
   */
  recordTransaction(assetCode: string, operationType: string) {
    const key = `${assetCode}_${operationType}`;
    this.transactionCounter.set(key, (this.transactionCounter.get(key) || 0) + 1);
  }

  /**
   * Record a settlement state change.
   */
  recordSettlement(provider: string, status: string) {
    const key = `${provider}_${status}`;
    this.settlementCounter.set(key, (this.settlementCounter.get(key) || 0) + 1);
  }

  /**
   * Record an HTTP request.
   */
  recordHttpRequest(method: string, path: string, status: number) {
    const key = `${method}_${path}_${status}`;
    this.httpRequestsCounter.set(key, (this.httpRequestsCounter.get(key) || 0) + 1);
  }

  /**
   * Set the current ledger drift count.
   */
  setLedgerDrift(driftCount: number) {
    this.ledgerDriftGauge = driftCount;
  }

  /**
   * Format all collected metrics in Prometheus text format (v0.0.4).
   */
  async getPrometheusMetrics(): Promise<string> {
    const lines: string[] = [];

    // 1. Financial Transactions
    lines.push('# HELP titanstream_financial_transactions_total Total financial operations processed');
    lines.push('# TYPE titanstream_financial_transactions_total counter');
    for (const [key, val] of this.transactionCounter.entries()) {
      const [asset, op] = key.split('_');
      lines.push(`titanstream_financial_transactions_total{asset="${asset}",operation_type="${op}"} ${val}`);
    }

    // 2. Settlements
    lines.push('# HELP titanstream_settlements_total Total settlement sessions processed');
    lines.push('# TYPE titanstream_settlements_total counter');
    for (const [key, val] of this.settlementCounter.entries()) {
      const [provider, status] = key.split('_');
      lines.push(`titanstream_settlements_total{provider="${provider}",status="${status}"} ${val}`);
    }

    // 3. Ledger Drift Gauge
    lines.push('# HELP titanstream_ledger_reconciliation_drift Accounts with balance drift vs double-entry ledger');
    lines.push('# TYPE titanstream_ledger_reconciliation_drift gauge');
    lines.push(`titanstream_ledger_reconciliation_drift ${this.ledgerDriftGauge}`);

    // 4. Live DB Stats
    const [userCount, settlementCount, activeOperations] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.settlementSession.count(),
      this.prisma.financialOperation.count({ where: { status: FinancialOperationStatus.REQUESTED } }),
    ]);

    lines.push('# HELP titanstream_registered_users_total Total registered platform users');
    lines.push('# TYPE titanstream_registered_users_total gauge');
    lines.push(`titanstream_registered_users_total ${userCount}`);

    lines.push('# HELP titanstream_active_settlements_total Total settlement sessions in database');
    lines.push('# TYPE titanstream_active_settlements_total gauge');
    lines.push(`titanstream_active_settlements_total ${settlementCount}`);

    lines.push('# HELP titanstream_pending_operations_total Financial operations pending execution');
    lines.push('# TYPE titanstream_pending_operations_total gauge');
    lines.push(`titanstream_pending_operations_total ${activeOperations}`);

    // 5. HTTP Requests
    lines.push('# HELP titanstream_http_requests_total Total HTTP requests handled');
    lines.push('# TYPE titanstream_http_requests_total counter');
    for (const [key, val] of this.httpRequestsCounter.entries()) {
      const [method, path, status] = key.split('_');
      lines.push(`titanstream_http_requests_total{method="${method}",path="${path}",status="${status}"} ${val}`);
    }

    return lines.join('\n') + '\n';
  }
}
