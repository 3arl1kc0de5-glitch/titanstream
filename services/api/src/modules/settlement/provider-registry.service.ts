import { BadRequestException, Injectable, Optional, OnModuleInit } from '@nestjs/common';
import {
  Prisma,
  SettlementProviderHealthStatus,
  SettlementProviderId,
  SettlementProviderStatus,
  SettlementStatus,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CryptoBotProvider } from './cryptobot.provider';
import { CreateSettlementSessionDto } from './dto/create-settlement-session.dto';
import { MerchantSettlementProvider } from './merchant-settlement.provider';
import { InternalOperationsProvider } from './operator-settlement.provider';
import { SettlementProvider } from './settlement-provider.interface';
import { SettlementRiskService } from './settlement-risk.service';

const ACTIVE_STATUSES = [
  SettlementStatus.CREATED,
  SettlementStatus.INITIALIZED,
  SettlementStatus.OPERATOR_ASSIGNED,
  SettlementStatus.MERCHANT_ASSIGNED,
  SettlementStatus.WAITING_FOR_PAYMENT,
  SettlementStatus.WAITING_PAYMENT,
  SettlementStatus.VERIFYING,
  SettlementStatus.APPROVED,
  SettlementStatus.POSTED,
  SettlementStatus.PAYMENT_RECEIVED,
  SettlementStatus.USDT_SENT,
];

@Injectable()
export class ProviderRegistryService implements OnModuleInit {
  private readonly adapters: Map<SettlementProviderId, SettlementProvider>;

  constructor(
    private readonly prisma: PrismaService,
    operator: InternalOperationsProvider,
    cryptobot: CryptoBotProvider,
    @Optional() merchant?: MerchantSettlementProvider,
    @Optional() private readonly riskService?: SettlementRiskService,
  ) {
    this.adapters = new Map<SettlementProviderId, SettlementProvider>([
      [operator.providerId, operator],
      [cryptobot.providerId, cryptobot],
    ]);
    if (merchant) {
      this.adapters.set(merchant.providerId, merchant);
    }
  }

  async onModuleInit() {
    try {
      await Promise.all([...this.adapters.values()].map((provider) => this.ensureProvider(provider)));
    } catch (err: any) {
      if (process.env.NODE_ENV === 'production') {
        console.error('FATAL: Failed to seed default settlement providers on startup:', err?.message);
        throw err;
      }
      console.warn('Failed to seed default settlement providers on startup:', err?.message);
    }
  }

  registerProvider(provider: SettlementProvider) {
    this.adapters.set(provider.providerId, provider);
    return this.ensureProvider(provider);
  }

  async enableProvider(providerId: SettlementProviderId) {
    return this.prisma.settlementProvider.update({
      where: { id: providerId },
      data: { status: SettlementProviderStatus.ENABLED },
    });
  }

  async disableProvider(providerId: SettlementProviderId) {
    return this.prisma.settlementProvider.update({
      where: { id: providerId },
      data: { status: SettlementProviderStatus.DISABLED },
    });
  }

  async checkProviderHealth(providerId: SettlementProviderId) {
    const record = await this.prisma.settlementProvider.findUnique({
      where: { id: providerId },
      include: { health: true },
    });
    if (!record) throw new BadRequestException('SETTLEMENT_PROVIDER_NOT_FOUND');
    return record.health;
  }

  async getProviderCapabilities(providerId: SettlementProviderId) {
    const adapter = this.adapters.get(providerId);
    if (!adapter) throw new BadRequestException('SETTLEMENT_PROVIDER_NOT_REGISTERED');
    return adapter.manifest;
  }

  async listProviders(params: { asset?: string; country?: string; buyOnly?: boolean } = {}) {
    const providers = await this.prisma.settlementProvider.findMany({
      where: { status: SettlementProviderStatus.ENABLED },
      include: { health: true, config: true },
      orderBy: { priority: 'asc' },
    });

    return providers
      .filter((provider: any) => provider.health?.healthStatus !== SettlementProviderHealthStatus.DOWN)
      .filter((provider: any) => {
        const manifest = provider.capabilityManifest || {};
        const assets = Array.isArray(manifest.supported_assets) ? manifest.supported_assets : provider.supportedAssets;
        const countries = Array.isArray(provider.supportedCountries) ? provider.supportedCountries : [];
        return (
          (!params.asset || assets.includes(params.asset)) &&
          (!params.country || countries.length === 0 || countries.includes(params.country)) &&
          (!params.buyOnly || manifest.supports_buy === true)
        );
      })
      .map((provider: any) => ({
        provider: provider.id,
        name: provider.displayName,
        displayName: provider.displayName,
        type: provider.id,
        status: provider.status,
        healthStatus: provider.health?.healthStatus || SettlementProviderHealthStatus.HEALTHY,
        priority: provider.priority,
        supported_assets: provider.supportedAssets,
        supported_countries: provider.supportedCountries,
        capabilities: provider.capabilityManifest,
        capabilityManifest: provider.capabilityManifest,
        created_at: provider.createdAt,
        updated_at: provider.updatedAt,
      }));
  }

  async routeCreate(telegramUserId: bigint, dto: CreateSettlementSessionDto) {
    const providerId = dto.provider || SettlementProviderId.INTERNAL_OPERATIONS;
    await this.assertNoActiveSettlement(telegramUserId, dto.asset);
    if (this.riskService) {
      await this.riskService.assertSessionCreationRisk(telegramUserId, Number(dto.expectedCryptoAmount));
    }
    const provider = await this.getEnabledAdapter(providerId, dto.asset, dto.country);
    return provider.createSettlement(telegramUserId, dto);
  }

  async approve(providerId: SettlementProviderId, settlementId: string, context: Record<string, unknown> = {}) {
    const provider = await this.getEnabledAdapter(providerId);
    return provider.approveSettlement(settlementId, context);
  }

  async cancel(settlementId: string) {
    const session = await this.prisma.settlementSession.findUnique({ where: { id: settlementId } });
    if (!session) throw new BadRequestException('SETTLEMENT_NOT_FOUND');
    const provider = await this.getEnabledAdapter(session.provider);
    return provider.cancelSettlement(settlementId);
  }

  async getSession(telegramUserId: bigint, settlementId: string) {
    const session = await this.prisma.settlementSession.findFirst({ where: { id: settlementId, telegramUserId } });
    if (!session) throw new BadRequestException('SETTLEMENT_NOT_FOUND');
    return this.toProviderIndependentView(session);
  }

  async history(telegramUserId: bigint) {
    const sessions = await this.prisma.settlementSession.findMany({ where: { telegramUserId }, orderBy: { createdAt: 'desc' } });
    return sessions.map((session) => this.toProviderIndependentView(session));
  }

  private async getEnabledAdapter(providerId: SettlementProviderId, asset?: string, country?: string) {
    const provider = await this.prisma.settlementProvider.findUnique({ where: { id: providerId }, include: { health: true } });
    if (!provider || provider.status !== SettlementProviderStatus.ENABLED) throw new BadRequestException('SETTLEMENT_PROVIDER_DISABLED');
    if (provider.health?.healthStatus === SettlementProviderHealthStatus.DOWN) throw new BadRequestException('SETTLEMENT_PROVIDER_DOWN');

    const manifest = provider.capabilityManifest as any;
    if (asset && Array.isArray(manifest.supported_assets) && !manifest.supported_assets.includes(asset)) {
      throw new BadRequestException('SETTLEMENT_PROVIDER_UNSUPPORTED_ASSET');
    }
    const countries = Array.isArray(provider.supportedCountries) ? provider.supportedCountries : [];
    if (country && countries.length > 0 && !countries.includes(country)) throw new BadRequestException('SETTLEMENT_PROVIDER_UNSUPPORTED_COUNTRY');

    const adapter = this.adapters.get(providerId);
    if (!adapter) throw new BadRequestException('SETTLEMENT_PROVIDER_NOT_REGISTERED');
    return adapter;
  }

  private async ensureProvider(provider: SettlementProvider) {
    let displayName = 'Mobile Money';
    if (provider.providerId === SettlementProviderId.CRYPTOBOT) displayName = 'CryptoBot';
    if (provider.providerId === SettlementProviderId.MERCHANT_MOBILE_MONEY) displayName = 'Merchant Mobile Money';

    await this.prisma.settlementProvider.upsert({
      where: { id: provider.providerId },
      update: {
        capabilityManifest: provider.manifest as unknown as Prisma.InputJsonValue,
        supportedAssets: provider.manifest.supported_assets as Prisma.InputJsonValue,
      },
      create: {
        id: provider.providerId,
        displayName,
        supportedAssets: provider.manifest.supported_assets as Prisma.InputJsonValue,
        supportedCountries: (provider.providerId === SettlementProviderId.CRYPTOBOT ? [] : ['KE']) as Prisma.InputJsonValue,
        capabilityManifest: provider.manifest as unknown as Prisma.InputJsonValue,
        priority: provider.providerId === SettlementProviderId.CRYPTOBOT ? 20 : 10,
        config: { create: { configuration: {} } },
        health: { create: { healthStatus: SettlementProviderHealthStatus.HEALTHY, details: {} } },
      },
    });
  }

  private async assertNoActiveSettlement(telegramUserId: bigint, asset: string) {
    const existing = await this.prisma.settlementSession.findFirst({
      where: { telegramUserId, asset, status: { in: ACTIVE_STATUSES } },
    });
    if (existing) throw new BadRequestException('ACTIVE_SETTLEMENT_EXISTS');
  }

  private toProviderIndependentView(session: any) {
    return {
      settlementId: session.id,
      provider: session.provider,
      reference: session.referenceCode,
      asset: session.asset,
      requestedAmount: session.requestedAmount.toString(),
      expectedAssetAmount: session.expectedCryptoAmount.toString(),
      exchangeRate: session.exchangeRate.toString(),
      status: session.status,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }
}

@Injectable()
export class SettlementProviderRegistry extends ProviderRegistryService {}

