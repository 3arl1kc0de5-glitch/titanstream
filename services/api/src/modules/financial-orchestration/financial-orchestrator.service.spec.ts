import { Test, TestingModule } from '@nestjs/testing';
import { FinancialOrchestratorService } from './financial-orchestrator.service';
import { IdempotencyService } from './idempotency.service';
import { CommandProcessorService } from './command-processor.service';
import { PrismaService } from '../../database/prisma.service';

describe('Stage — Financial Orchestrator transactional + BigInt-safe idempotency', () => {
  let service: FinancialOrchestratorService;
  let idempotency: { begin: jest.Mock; complete: jest.Mock; fail: jest.Mock };
  let commands: { execute: jest.Mock };
  let mockTx: any;
  let mockPrisma: { $transaction: jest.Mock };

  const operationRecordWithBigInt = {
    id: 'op_1',
    telegramUserId: BigInt('90000000000001'),
    financialAccountId: 'acc_1',
    status: 'COMPLETED',
    transaction: { id: 'txn_1', telegramUserId: BigInt('90000000000001') },
  };

  const baseCommand = {
    telegramUserId: BigInt('90000000000001'),
    operationType: 'SYSTEM_ALLOCATION',
    assetCode: 'USDT',
    amount: '0.085007',
    idempotencyKey: 'mining_claim_90000000000001_1',
    reference: 'mining_claim_90000000000001_1',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    idempotency = {
      begin: jest.fn().mockResolvedValue({ replay: false, record: { id: 'rec_1' } }),
      complete: jest.fn().mockResolvedValue(undefined),
      fail: jest.fn().mockResolvedValue(undefined),
    };
    commands = {
      execute: jest.fn().mockResolvedValue(operationRecordWithBigInt),
    };
    mockTx = {};
    mockPrisma = {
      $transaction: jest.fn(async (cb: any) => cb(mockTx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialOrchestratorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IdempotencyService, useValue: idempotency },
        { provide: CommandProcessorService, useValue: commands },
      ],
    }).compile();

    service = module.get(FinancialOrchestratorService);
  });

  it('runs the operation inside a single database transaction by default', async () => {
    await service.requestOperation(baseCommand);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(commands.execute).toHaveBeenCalledTimes(1);
    expect(commands.execute.mock.calls[0][1]).toBe(mockTx);
    expect(idempotency.begin.mock.calls[0][3]).toBe(mockTx);
    expect(idempotency.complete.mock.calls[0][3]).toBe(mockTx);
  });

  it('uses the caller-provided transaction client when supplied (composite flows)', async () => {
    const externalTx = { custom: true };
    await service.requestOperation(baseCommand, externalTx as any);

    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(commands.execute.mock.calls[0][1]).toBe(externalTx);
    expect(idempotency.begin.mock.calls[0][3]).toBe(externalTx);
  });

  it('persists a JSON-serializable response payload when the operation record contains BigInt values', async () => {
    await service.requestOperation(baseCommand);

    const [, operationId, responsePayload] = idempotency.complete.mock.calls[0];
    expect(operationId).toBe('op_1');
    expect(() => JSON.stringify(responsePayload)).not.toThrow();
    const parsed = JSON.parse(JSON.stringify(responsePayload));
    expect(parsed.telegramUserId).toBe('90000000000001');
    expect(parsed.transaction.telegramUserId).toBe('90000000000001');
  });

  it('returns a JSON-serializable result to the caller', async () => {
    const result = await service.requestOperation(baseCommand);

    expect(() => JSON.stringify(result)).not.toThrow();
    expect((result as any).telegramUserId).toBe('90000000000001');
  });

  it('propagates command failures so the enclosing transaction rolls everything back', async () => {
    commands.execute.mockRejectedValueOnce(new Error('BOOM'));

    await expect(service.requestOperation(baseCommand)).rejects.toThrow('BOOM');
    // No idempotency completion is persisted for a failed execution — the
    // rollback of the enclosing transaction is the failure record.
    expect(idempotency.complete).not.toHaveBeenCalled();
  });
});
