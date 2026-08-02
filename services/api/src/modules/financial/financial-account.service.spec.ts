import { BadRequestException } from '@nestjs/common';
import { FinancialAccountStatus } from '@prisma/client';
import { UserState } from '../../common/interfaces/user-state.enum';
import { FinancialAccountService } from './financial-account.service';

describe('FinancialAccountService', () => {
  const telegramUserId = 123456789n;

  it('creates one active financial account for a ready user', async () => {
    const prisma = {
      user: { findUnique: jest.fn(async () => ({ telegramUserId, state: UserState.READY, isReady: true })) },
    };
    const repository = {
      findByTelegramUserId: jest.fn(async () => null),
      createActive: jest.fn(async () => ({
        id: 'financial-account-id',
        telegramUserId,
        status: FinancialAccountStatus.ACTIVE,
      })),
    };
    const auditService = { create: jest.fn(async () => ({})), createWithClient: jest.fn(async () => ({})) };

    const service = new FinancialAccountService(prisma as any, repository as any, auditService as any);
    const account = await service.getOrCreateForReadyUser(telegramUserId);

    expect(account.id).toBe('financial-account-id');
    expect(repository.createActive).toHaveBeenCalledWith(telegramUserId, prisma);
    expect(auditService.createWithClient).toHaveBeenCalledWith(prisma, expect.objectContaining({
      telegramUserId,
      metadata: expect.objectContaining({ financialAccountId: 'financial-account-id' }),
    }));
  });

  it('rejects users who are not ready', async () => {
    const service = new FinancialAccountService(
      { user: { findUnique: jest.fn(async () => ({ telegramUserId, state: UserState.FROZEN, isReady: false })) } } as any,
      { findByTelegramUserId: jest.fn(async () => null), createActive: jest.fn() } as any,
      { create: jest.fn(), createWithClient: jest.fn() } as any,
    );

    await expect(service.getOrCreateForReadyUser(telegramUserId)).rejects.toBeInstanceOf(BadRequestException);
  });
});
