import { BadRequestException } from '@nestjs/common';
import { Prisma, SettlementProviderHealthStatus, SettlementProviderId, SettlementProviderStatus } from '@prisma/client';
import { ProviderRegistryService } from './provider-registry.service';

describe('ProviderRegistryService', () => {
  const prisma = {
    settlementProvider: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    settlementSession: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const operatorProvider = {
    providerId: SettlementProviderId.INTERNAL_OPERATIONS,
    manifest: {
      provider: SettlementProviderId.INTERNAL_OPERATIONS,
      supports_buy: true,
      supports_sell: false,
      supports_refunds: false,
      supports_webhooks: false,
      supports_manual_review: true,
      supports_partial_payments: false,
      supported_assets: ['USDT'],
    },
    createSettlement: jest.fn(),
    cancelSettlement: jest.fn(),
  };
  const cryptobotProvider = {
    providerId: SettlementProviderId.CRYPTOBOT,
    manifest: {
      provider: SettlementProviderId.CRYPTOBOT,
      supports_buy: true,
      supports_sell: false,
      supports_refunds: false,
      supports_webhooks: true,
      supports_manual_review: false,
      supports_partial_payments: false,
      supported_assets: ['USDT'],
    },
    createSettlement: jest.fn(),
    approveSettlement: jest.fn(),
    cancelSettlement: jest.fn(),
  };
  const service = new ProviderRegistryService(prisma as any, operatorProvider as any, cryptobotProvider as any);

  beforeEach(() => jest.clearAllMocks());

  it('returns capability manifests for enabled healthy providers', async () => {
    prisma.settlementProvider.findMany.mockResolvedValue([
      {
        id: SettlementProviderId.CRYPTOBOT,
        displayName: 'CryptoBot',
        status: SettlementProviderStatus.ENABLED,
        priority: 20,
        supportedAssets: ['USDT'],
        supportedCountries: [],
        capabilityManifest: cryptobotProvider.manifest,
        health: { healthStatus: SettlementProviderHealthStatus.HEALTHY },
      },
    ]);

    await expect(service.listProviders({ asset: 'USDT', buyOnly: true })).resolves.toEqual([
      expect.objectContaining({
        provider: SettlementProviderId.CRYPTOBOT,
        capabilityManifest: expect.objectContaining({ supports_webhooks: true, supported_assets: ['USDT'] }),
      }),
    ]);
  });

  it('routes creation to the selected provider after active-session check', async () => {
    prisma.settlementSession.findFirst.mockResolvedValue(null);
    prisma.settlementProvider.findUnique.mockResolvedValue({
      id: SettlementProviderId.CRYPTOBOT,
      status: SettlementProviderStatus.ENABLED,
      supportedCountries: [],
      capabilityManifest: cryptobotProvider.manifest,
      health: { healthStatus: SettlementProviderHealthStatus.HEALTHY },
    });
    cryptobotProvider.createSettlement.mockResolvedValue({ settlementId: 'set_1' });

    await expect(
      service.routeCreate(123n, {
        provider: SettlementProviderId.CRYPTOBOT,
        asset: 'USDT',
        requestedAmount: '10',
        expectedCryptoAmount: '10',
        exchangeRate: '1',
        country: 'KE',
        mobileMoneyNetwork: 'CRYPTOBOT',
      }),
    ).resolves.toEqual({ settlementId: 'set_1' });
  });

  it('blocks a second active settlement for the same user and asset', async () => {
    prisma.settlementSession.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(
      service.routeCreate(123n, {
        provider: SettlementProviderId.CRYPTOBOT,
        asset: 'USDT',
        requestedAmount: '10',
        expectedCryptoAmount: '10',
        exchangeRate: '1',
        country: 'KE',
        mobileMoneyNetwork: 'CRYPTOBOT',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
