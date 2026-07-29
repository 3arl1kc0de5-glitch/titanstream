import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationService } from './reconciliation.service';
import { PrismaService } from '../../database/prisma.service';
import { MetricsService } from '../metrics/metrics.service';
import { LedgerEntryType, PaymentInvoiceStatus, ReconciliationRunStatus, RiskSeverity } from '@prisma/client';

describe('Stage 11.0.3 — Financial Reconciliation Engine Tests', () => {
  let service: ReconciliationService;

  const mockPrismaService = {
    reconciliationRun: {
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'run_101', ...args.data })),
      update: jest.fn().mockImplementation((args) => Promise.resolve({ id: args.where.id, ...args.data })),
      findMany: jest.fn(),
    },
    reconciliationCheckpoint: {
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'chk_1', ...args.data })),
    },
    paymentInvoice: {
      findMany: jest.fn(),
    },
    financialOperation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    transactionGroup: {
      findMany: jest.fn(),
    },
    riskEvent: {
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'risk_1', ...args.data })),
    },
  };

  const mockMetricsService = {
    setLedgerDrift: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MetricsService, useValue: mockMetricsService },
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
  });

  it('runs full reconciliation successfully when all deposits, ledger entries, and operations match', async () => {
    mockPrismaService.paymentInvoice.findMany.mockResolvedValue([
      {
        id: 'inv_1',
        externalInvoiceId: '778899',
        telegramUserId: 12345n,
        amount: '50.00',
        status: PaymentInvoiceStatus.PAID,
      },
    ]);
    mockPrismaService.financialOperation.findFirst.mockResolvedValue({ id: 'op_matched_1' });
    mockPrismaService.transactionGroup.findMany.mockResolvedValue([
      {
        id: 'grp_1',
        reference: 'cryptobot_inv_778899',
        ledgerEntries: [
          { entryType: LedgerEntryType.CREDIT, amount: '50.00' },
          { entryType: LedgerEntryType.DEBIT, amount: '50.00' },
        ],
      },
    ]);
    mockPrismaService.financialOperation.findMany.mockResolvedValue([]);

    const report = await service.runFullReconciliation('UNIT_TEST');

    expect(report.status).toBe(ReconciliationRunStatus.COMPLETED);
    expect(report.summary.passedCheckpoints).toBe(2);
    expect(report.summary.failedCheckpoints).toBe(0);
    expect(mockMetricsService.setLedgerDrift).toHaveBeenCalledWith(0);
  });

  it('flags external deposit mismatch when paid invoice has no ledger operation', async () => {
    mockPrismaService.paymentInvoice.findMany.mockResolvedValue([
      {
        id: 'inv_unmatched_1',
        externalInvoiceId: '999999',
        telegramUserId: 55555n,
        amount: '100.00',
        status: PaymentInvoiceStatus.PAID,
      },
    ]);
    mockPrismaService.financialOperation.findFirst.mockResolvedValue(null);
    mockPrismaService.transactionGroup.findMany.mockResolvedValue([]);
    mockPrismaService.financialOperation.findMany.mockResolvedValue([]);

    const report = await service.runFullReconciliation('UNIT_TEST');

    expect(report.status).toBe(ReconciliationRunStatus.FAILED);
    expect(report.summary.externalDepositDiscrepancies).toBe(1);
    expect(mockPrismaService.riskEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ruleTriggered: 'UNRECONCILED_PAID_INVOICE',
        severity: RiskSeverity.CRITICAL,
      }),
    });
  });

  it('detects stuck financial operations exceeding 10 minutes timeout', async () => {
    mockPrismaService.paymentInvoice.findMany.mockResolvedValue([]);
    mockPrismaService.transactionGroup.findMany.mockResolvedValue([]);
    mockPrismaService.financialOperation.findMany.mockResolvedValue([
      {
        id: 'stuck_op_1',
        operationType: 'SYSTEM_ALLOCATION',
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
      },
    ]);

    const report = await service.runFullReconciliation('UNIT_TEST');

    expect(report.summary.stuckOperationsCount).toBe(1);
    expect(report.details.stuckOperations[0].operationId).toBe('stuck_op_1');
  });
});
