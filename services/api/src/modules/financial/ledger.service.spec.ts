import { BadRequestException } from '@nestjs/common';
import { LedgerEntryType, Prisma } from '@prisma/client';
import { LedgerService } from './ledger.service';

describe('LedgerService', () => {
  const telegramUserId = 123456789n;
  const financialAccountId = 'financial-account-id';

  function createService() {
    const tx = {
      transactionGroup: {
        create: jest.fn(async () => ({ id: 'group-id', reference: 'ref-1' })),
      },
      ledgerEntry: {
        create: jest.fn(async ({ data }: any) => ({ id: `entry-${data.entryType}`, ...data })),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: any) => callback(tx)),
      ledgerEntry: { findMany: jest.fn() },
    };
    const service = new LedgerService(
      prisma as any,
      { getEnabled: jest.fn(async () => ({ assetCode: 'USDT' })) } as any,
      { getRequired: jest.fn(async (code: string) => ({ id: `${code}-id`, code })) } as any,
      { create: jest.fn(async () => ({})), createWithClient: jest.fn(async () => ({})) } as any,
    );
    return { service, prisma, tx };
  }

  it('posts a balanced debit and credit group', async () => {
    const { service, tx } = createService();

    const result = await service.postBalancedGroup({
      telegramUserId,
      financialAccountId,
      assetCode: 'USDT',
      reference: 'ref-1',
      lines: [
        { ledgerAccountCode: 'PLATFORM_RESERVE', entryType: LedgerEntryType.DEBIT, amount: '10.000000', reference: 'ref-1-dr' },
        { ledgerAccountCode: 'USER_ASSET_LIABILITY', entryType: LedgerEntryType.CREDIT, amount: '10.000000', reference: 'ref-1-cr' },
      ],
    });

    expect(result.entries).toHaveLength(2);
    expect(tx.ledgerEntry.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amount: expect.any(Prisma.Decimal) }),
    }));
  });

  it('rejects unbalanced ledger groups', async () => {
    const { service } = createService();

    await expect(service.postBalancedGroup({
      telegramUserId,
      financialAccountId,
      assetCode: 'USDT',
      reference: 'bad-ref',
      lines: [
        { ledgerAccountCode: 'PLATFORM_RESERVE', entryType: LedgerEntryType.DEBIT, amount: '10', reference: 'bad-dr' },
        { ledgerAccountCode: 'USER_ASSET_LIABILITY', entryType: LedgerEntryType.CREDIT, amount: '9', reference: 'bad-cr' },
      ],
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});
