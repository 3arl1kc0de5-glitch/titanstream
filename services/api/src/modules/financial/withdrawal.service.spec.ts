import { FinancialOperationType, SettlementStatus, SettlementType } from '@prisma/client';
import { WithdrawalService } from './withdrawal.service';

describe('WithdrawalService', () => {
  const prisma = {
    settlementSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const orchestrator = {
    requestOperation: jest.fn(),
  };

  const riskService = {
    evaluateWithdrawal: jest.fn(),
  };

  const auditService = {
    logAction: jest.fn(),
  };

  let service: WithdrawalService;

  beforeEach(() => {
    jest.clearAllMocks();
    const eventBus = { publish: jest.fn() };
    service = new WithdrawalService(prisma as any, orchestrator as any, riskService as any, auditService as any, eventBus as any);
  });

  it('initiates withdrawal, reserves funds via orchestrator, and auto-dispatches payout', async () => {
    const telegramUserId = BigInt(123456789);
    riskService.evaluateWithdrawal.mockResolvedValue({
      allowed: true,
      requiresManualReview: false,
      userTier: 'Gold',
      dailyLimitUsd: 5000,
      remainingDailyLimitUsd: 4900,
    });

    orchestrator.requestOperation.mockResolvedValue({ id: 'op_reserve_1' });

    prisma.settlementSession.create.mockResolvedValue({
      id: 'sess_wd_1',
      telegramUserId,
      referenceCode: 'WD-123456',
      requestedAmount: 100,
      status: SettlementStatus.WAITING_FOR_PAYMENT,
    });

    prisma.settlementSession.findUnique.mockResolvedValue({
      id: 'sess_wd_1',
      telegramUserId,
      asset: 'USDT',
      requestedAmount: 100,
      status: SettlementStatus.WAITING_FOR_PAYMENT,
      providerMetadata: {},
    });

    prisma.settlementSession.update.mockResolvedValue({
      id: 'sess_wd_1',
      status: SettlementStatus.COMPLETED,
    });

    const res = await service.initiateWithdrawal({
      telegramUserId,
      amount: 100,
      network: 'TRC20',
      destinationAddress: 'TXYZ1234567890',
    });

    expect(riskService.evaluateWithdrawal).toHaveBeenCalledWith(telegramUserId, 100);
    expect(orchestrator.requestOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        operationType: FinancialOperationType.WITHDRAWAL_RESERVE,
        amount: '100',
      }),
    );
    expect(prisma.settlementSession.create).toHaveBeenCalled();
  });

  it('rejects withdrawal and restores balance via WITHDRAWAL_REVERSAL', async () => {
    const telegramUserId = BigInt(987654321);
    const admin = { id: 'admin_1', role: 'SUPER_ADMIN' };

    prisma.settlementSession.findUnique.mockResolvedValue({
      id: 'sess_wd_pending',
      telegramUserId,
      referenceCode: 'WD-999',
      asset: 'USDT',
      requestedAmount: 250,
      status: SettlementStatus.WAITING_PAYMENT,
      providerMetadata: {},
    });

    prisma.settlementSession.update.mockResolvedValue({
      id: 'sess_wd_pending',
      status: SettlementStatus.REJECTED,
    });

    const res = await service.rejectWithdrawal(admin, 'sess_wd_pending', 'SUSPICIOUS_VELOCITY');

    expect(orchestrator.requestOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        operationType: FinancialOperationType.WITHDRAWAL_REVERSAL,
        amount: '250',
      }),
    );
    expect(auditService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'WITHDRAWAL_REJECTED' }),
    );
  });
});
