import { BadRequestException } from '@nestjs/common';
import { Prisma, SettlementStatus } from '@prisma/client';
import { SettlementService } from './settlement.service';

describe('SettlementService', () => {
  const prisma = {
    settlementSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    operationsQueueItem: { create: jest.fn() },
  };
  const routing = {};
  const operators = { decrementLoad: jest.fn().mockResolvedValue(undefined), incrementLoad: jest.fn().mockResolvedValue(undefined) };
  const orchestrator = { requestOperation: jest.fn() };
  const eventBus = { publish: jest.fn() };
  const service = new SettlementService(prisma as any, routing as any, operators as any, orchestrator as any, eventBus as any);

  const activeSession = {
    id: 'set_1',
    telegramUserId: 123n,
    operatorId: 'operator_1',
    asset: 'USDT',
    requestedAmount: new Prisma.Decimal('1000'),
    expectedCryptoAmount: new Prisma.Decimal('10'),
    exchangeRate: new Prisma.Decimal('100'),
    referenceCode: 'TS-ABC123',
    status: SettlementStatus.PAYMENT_RECEIVED,
    expiresAt: new Date(Date.now() + 60_000),
  };

  beforeEach(() => jest.clearAllMocks());

  it('approves and completes exactly one valid operator settlement', async () => {
    prisma.settlementSession.findUnique.mockResolvedValue(activeSession);
    prisma.settlementSession.update.mockResolvedValueOnce({ ...activeSession, status: SettlementStatus.USDT_SENT });
    prisma.settlementSession.update.mockResolvedValueOnce({ ...activeSession, status: SettlementStatus.COMPLETED });
    orchestrator.requestOperation.mockResolvedValue({ id: 'op_1' });

    await expect(service.confirmUsdtSent('operator_1', 'set_1', '10')).resolves.toMatchObject({ status: SettlementStatus.COMPLETED });

    expect(orchestrator.requestOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        telegramUserId: 123n,
        assetCode: 'USDT',
        amount: '10',
        idempotencyKey: 'settlement_set_1',
        reference: 'settlement_set_1',
      }),
    );
  });

  it('blocks duplicate completion before calling the orchestrator', async () => {
    prisma.settlementSession.findUnique.mockResolvedValue({ ...activeSession, status: SettlementStatus.COMPLETED });

    await expect(service.confirmUsdtSent('operator_1', 'set_1', '10')).rejects.toBeInstanceOf(BadRequestException);
    expect(orchestrator.requestOperation).not.toHaveBeenCalled();
  });

  it('blocks invalid crypto amount before calling the orchestrator', async () => {
    prisma.settlementSession.findUnique.mockResolvedValue(activeSession);

    await expect(service.confirmUsdtSent('operator_1', 'set_1', '9.99')).rejects.toBeInstanceOf(BadRequestException);
    expect(orchestrator.requestOperation).not.toHaveBeenCalled();
  });

  it('triggers financial orchestrator on processSettlementApproved and updates status to COMPLETED', async () => {
    prisma.settlementSession.findUnique.mockResolvedValue(activeSession);
    orchestrator.requestOperation.mockResolvedValue({ id: 'op_approved_1' });
    prisma.settlementSession.update.mockResolvedValue({ ...activeSession, status: SettlementStatus.COMPLETED });

    const res = await service.processSettlementApproved('set_1', { note: 'Auto-approved' });
    expect(res.status).toBe(SettlementStatus.COMPLETED);
    expect(orchestrator.requestOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        telegramUserId: 123n,
        amount: '10',
        idempotencyKey: 'settlement_set_1',
      }),
    );
  });

  it('prevents duplicate processing on processSettlementApproved for COMPLETED sessions', async () => {
    const completedSession = { ...activeSession, status: SettlementStatus.COMPLETED };
    prisma.settlementSession.findUnique.mockResolvedValue(completedSession);

    const res = await service.processSettlementApproved('set_1');
    expect(res.status).toBe(SettlementStatus.COMPLETED);
    expect(orchestrator.requestOperation).not.toHaveBeenCalled();
  });
});
