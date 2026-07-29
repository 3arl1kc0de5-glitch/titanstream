import { Injectable } from '@nestjs/common';
import { SettlementEventType, SettlementProviderId } from '@prisma/client';
import { CreateSettlementSessionDto } from './dto/create-settlement-session.dto';
import { ProviderEventService } from './provider-event.service';
import { SettlementCapabilityManifest, SettlementProvider } from './settlement-provider.interface';
import { SettlementService } from './settlement.service';

@Injectable()
export class MerchantSettlementProvider implements SettlementProvider {
  readonly providerId = SettlementProviderId.MERCHANT_MOBILE_MONEY;
  readonly manifest: SettlementCapabilityManifest = {
    provider: SettlementProviderId.MERCHANT_MOBILE_MONEY,
    supports_buy: true,
    supports_sell: false,
    supports_refunds: false,
    supports_webhooks: false,
    supports_manual_review: true,
    supports_partial_payments: false,
    supported_assets: ['USDT'],
  };

  constructor(
    private readonly settlements: SettlementService,
    private readonly events: ProviderEventService,
  ) {}

  getCapabilities(): SettlementCapabilityManifest {
    return this.manifest;
  }

  async createSettlement(telegramUserId: bigint, dto: CreateSettlementSessionDto) {
    return this.settlements.createCustomerSession(telegramUserId, {
      ...dto,
      provider: SettlementProviderId.MERCHANT_MOBILE_MONEY,
    });
  }

  async initializeSettlement(settlementId: string) {
    const session = await this.settlements.getProviderSession(settlementId);
    await this.emitSettlementEvent(settlementId, SettlementEventType.SettlementInitialized, {
      provider: this.providerId,
    });
    return session;
  }

  async getSettlementStatus(settlementId: string) {
    return this.settlements.getProviderSession(settlementId);
  }

  async verifySettlement(settlementId: string) {
    const session = await this.settlements.getProviderSession(settlementId);
    await this.emitSettlementEvent(settlementId, SettlementEventType.SettlementVerificationStarted, {
      provider: this.providerId,
    });
    return session;
  }

  async assignMerchant(settlementId: string, operatorId: string) {
    const session = await this.settlements.getProviderSession(settlementId);
    await this.emitSettlementEvent(settlementId, SettlementEventType.OperatorAssigned, { operatorId });
    return session;
  }

  async trackMerchantProgress(settlementId: string) {
    return this.settlements.getProviderSession(settlementId);
  }

  async verifyMerchantCompletion(settlementId: string) {
    const session = await this.settlements.getProviderSession(settlementId);
    return session;
  }

  async approveSettlement(settlementId: string, context: Record<string, unknown> = {}) {
    await this.emitSettlementEvent(settlementId, SettlementEventType.SettlementApproved, context);
    return this.settlements.getProviderSession(settlementId);
  }

  async rejectSettlement(settlementId: string, reason?: string) {
    return this.settlements.rejectAssignedSettlement(settlementId, reason);
  }

  async expireSettlement(settlementId: string) {
    return this.settlements.expireOne(settlementId);
  }

  async cancelSettlement(settlementId: string) {
    return this.settlements.cancel(settlementId);
  }

  validateSettlement(settlementId: string) {
    return this.settlements.getProviderSession(settlementId);
  }

  monitorSettlement(settlementId: string) {
    return this.settlements.getProviderSession(settlementId);
  }

  emitSettlementEvent(settlementId: string, eventType: SettlementEventType, payload: Record<string, unknown> = {}) {
    return this.events.emit(this.providerId, settlementId, eventType, payload);
  }
}
