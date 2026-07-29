import { Injectable } from '@nestjs/common';
import { SettlementEventType, SettlementProviderId } from '@prisma/client';
import { CreateSettlementSessionDto } from './dto/create-settlement-session.dto';
import { ProviderEventService } from './provider-event.service';
import { SettlementCapabilityManifest, SettlementProvider } from './settlement-provider.interface';
import { SettlementService } from './settlement.service';

@Injectable()
export class InternalOperationsProvider implements SettlementProvider {
  readonly providerId = SettlementProviderId.INTERNAL_OPERATIONS;
  readonly manifest = {
    provider: SettlementProviderId.INTERNAL_OPERATIONS,
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

  createSettlement(telegramUserId: bigint, dto: CreateSettlementSessionDto) {
    return this.settlements.createCustomerSession(telegramUserId, { ...dto, provider: SettlementProviderId.INTERNAL_OPERATIONS });
  }

  async initializeSettlement(settlementId: string) {
    return this.settlements.getProviderSession(settlementId);
  }

  async getSettlementStatus(settlementId: string) {
    return this.settlements.getProviderSession(settlementId);
  }

  async verifySettlement(settlementId: string) {
    return this.settlements.getProviderSession(settlementId);
  }

  validateSettlement(settlementId: string) {
    return this.settlements.getProviderSession(settlementId);
  }

  monitorSettlement(settlementId: string) {
    return this.settlements.getProviderSession(settlementId);
  }

  approveSettlement(settlementId: string) {
    return this.emitSettlementEvent(settlementId, SettlementEventType.SettlementApproved);
  }

  rejectSettlement(settlementId: string, reason?: string) {
    return this.settlements.rejectAssignedSettlement(settlementId, reason);
  }

  expireSettlement(settlementId: string) {
    return this.settlements.expireOne(settlementId);
  }

  cancelSettlement(settlementId: string) {
    return this.settlements.cancel(settlementId);
  }

  emitSettlementEvent(settlementId: string, eventType: SettlementEventType, payload: Record<string, unknown> = {}) {
    return this.events.emit(this.providerId, settlementId, eventType, payload);
  }
}
