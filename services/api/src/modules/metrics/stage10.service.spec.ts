import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { LedgerReconciliationSweeperService } from '../financial-orchestration/ledger-reconciliation-sweeper.service';
import { HealthController } from '../health/health.controller';
import { LedgerEntryType, RiskSeverity, RiskEventStatus } from '@prisma/client';

describe('Stage 10 — Production Readiness, Metrics & Ledger Reconciliation Tests', () => {
  let metricsService: MetricsService;
  let metricsController: MetricsController;
  let sweeperService: LedgerReconciliationSweeperService;
  let healthController: HealthController;

  const mockPrismaService = {
    user: {
      count: jest.fn().mockResolvedValue(150),
    },
    settlementSession: {
      count: jest.fn().mockResolvedValue(42),
    },
    financialOperation: {
      count: jest.fn().mockResolvedValue(3),
    },
    transactionGroup: {
      findMany: jest.fn(),
    },
    ledgerAccount: {
      findMany: jest.fn().mockResolvedValue([
        { code: 'PLATFORM_RESERVE' },
        { code: 'USER_ASSET_LIABILITY' },
      ]),
    },
    riskEvent: {
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'risk_1', ...args.data })),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController, HealthController],
      providers: [
        MetricsService,
        LedgerReconciliationSweeperService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    metricsService = module.get<MetricsService>(MetricsService);
    metricsController = module.get<MetricsController>(MetricsController);
    sweeperService = module.get<LedgerReconciliationSweeperService>(LedgerReconciliationSweeperService);
    healthController = module.get<HealthController>(HealthController);
  });

  describe('Prometheus Metrics Engine', () => {
    it('should record transactions, settlements, and format Prometheus text output', async () => {
      metricsService.recordTransaction('USDT', 'DEPOSIT');
      metricsService.recordSettlement('MerchantProvider', 'COMPLETED');
      metricsService.recordHttpRequest('GET', '/api/growth/profile', 200);
      metricsService.setLedgerDrift(0);

      const metricsOutput = await metricsController.getMetrics();

      expect(metricsOutput).toContain('titanstream_financial_transactions_total{asset="USDT",operation_type="DEPOSIT"} 1');
      expect(metricsOutput).toContain('titanstream_settlements_total{provider="MerchantProvider",status="COMPLETED"} 1');
      expect(metricsOutput).toContain('titanstream_ledger_reconciliation_drift 0');
      expect(metricsOutput).toContain('titanstream_registered_users_total 150');
      expect(metricsOutput).toContain('titanstream_active_settlements_total 42');
      expect(metricsOutput).toContain('titanstream_pending_operations_total 3');
      expect(metricsOutput).toContain('titanstream_http_requests_total{method="GET",path="/api/growth/profile",status="200"} 1');
    });
  });

  describe('Automated Ledger Reconciliation Sweeper', () => {
    it('should pass audit when all TransactionGroups are balanced (Credits == Debits)', async () => {
      mockPrismaService.transactionGroup.findMany.mockResolvedValueOnce([
        {
          id: 'grp_100',
          reference: 'ref_grp_100',
          ledgerEntries: [
            { entryType: LedgerEntryType.CREDIT, amount: '100.000000' },
            { entryType: LedgerEntryType.DEBIT, amount: '100.000000' },
          ],
        },
      ]);

      const report = await sweeperService.runAuditSweep();

      expect(report.totalTransactionGroupsChecked).toBe(1);
      expect(report.imbalancedGroupCount).toBe(0);
      expect(mockPrismaService.riskEvent.create).not.toHaveBeenCalled();
    });

    it('should detect imbalanced TransactionGroups and trigger CRITICAL RiskEvents', async () => {
      mockPrismaService.transactionGroup.findMany.mockResolvedValueOnce([
        {
          id: 'grp_999_drift',
          reference: 'ref_drift_999',
          ledgerEntries: [
            { entryType: LedgerEntryType.CREDIT, amount: '100.000000' },
            { entryType: LedgerEntryType.DEBIT, amount: '80.000000' },
          ],
        },
      ]);

      const report = await sweeperService.runAuditSweep();

      expect(report.totalTransactionGroupsChecked).toBe(1);
      expect(report.imbalancedGroupCount).toBe(1);
      expect(report.imbalancedGroups[0].groupId).toBe('grp_999_drift');
      expect(report.imbalancedGroups[0].difference).toBe('20.000000');

      expect(mockPrismaService.riskEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: 'TRANSACTION_GROUP',
          entityId: 'grp_999_drift',
          ruleTriggered: 'LEDGER_TRANSACTION_GROUP_IMBALANCE',
          severity: RiskSeverity.CRITICAL,
          status: RiskEventStatus.OPEN,
        }),
      });
    });
  });

  describe('System Health Probes', () => {
    it('should return UP status for /health/liveness probe', () => {
      const result = healthController.getLiveness();
      expect(result.status).toBe('UP');
      expect(result.service).toBe('titanstream-api');
    });

    it('should return READY status for /health/readiness probe when DB query succeeds', async () => {
      process.env.DATABASE_URL = 'postgres://test';
      process.env.JWT_SECRET = 'test';
      process.env.JWT_REFRESH_SECRET = 'test';
      process.env.TELEGRAM_BOT_TOKEN = 'test';
      try {
        const result = await healthController.getReadiness();
        expect(result.status).toBe('READY');
        expect(result.checks.database).toBe('UP');
        expect(result.checks.ledger).toBe('UP');
      } finally {
        delete process.env.DATABASE_URL;
        delete process.env.JWT_SECRET;
        delete process.env.JWT_REFRESH_SECRET;
        delete process.env.TELEGRAM_BOT_TOKEN;
      }
    });
  });
});
