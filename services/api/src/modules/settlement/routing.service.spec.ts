import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RoutingService } from './routing.service';

describe('RoutingService', () => {
  const repository = {
    findRoutable: jest.fn(),
  };
  const service = new RoutingService(repository as any);

  beforeEach(() => jest.clearAllMocks());

  it('selects the lowest load, highest trust, fastest eligible operator', async () => {
    repository.findRoutable.mockResolvedValue([
      {
        id: 'slow',
        supportedCurrencies: ['USDT'],
        supportedMobileMoneyNetworks: ['MPESA'],
        currentLoad: 1,
        capacity: 2,
        dailyLimit: new Prisma.Decimal('1000'),
        trustScore: 95,
        averageCompletionTimeSeconds: 1200,
      },
      {
        id: 'best',
        supportedCurrencies: ['USDT'],
        supportedMobileMoneyNetworks: ['MPESA'],
        currentLoad: 1,
        capacity: 5,
        dailyLimit: new Prisma.Decimal('1000'),
        trustScore: 80,
        averageCompletionTimeSeconds: 600,
      },
      {
        id: 'wrong-network',
        supportedCurrencies: ['USDT'],
        supportedMobileMoneyNetworks: ['AIRTEL'],
        currentLoad: 0,
        capacity: 5,
        dailyLimit: new Prisma.Decimal('1000'),
        trustScore: 100,
        averageCompletionTimeSeconds: 300,
      },
    ]);

    await expect(
      service.selectOperator({ country: 'KE', network: 'MPESA', asset: 'USDT', requestedAmount: '100' }),
    ).resolves.toMatchObject({ id: 'best' });
  });

  it('rejects when no operator is eligible', async () => {
    repository.findRoutable.mockResolvedValue([
      {
        id: 'full',
        supportedCurrencies: ['USDT'],
        supportedMobileMoneyNetworks: ['MPESA'],
        currentLoad: 2,
        capacity: 2,
        dailyLimit: new Prisma.Decimal('1000'),
        trustScore: 100,
        averageCompletionTimeSeconds: 300,
      },
    ]);

    await expect(service.selectOperator({ country: 'KE', network: 'MPESA', asset: 'USDT', requestedAmount: '100' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
