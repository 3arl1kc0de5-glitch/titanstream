import { SettlementProviderId } from '@prisma/client';
import { CreateSettlementSessionDto } from './dto/create-settlement-session.dto';

export interface SettlementCapabilityManifest {
  provider: SettlementProviderId;
  supports_buy: boolean;
  supports_sell: boolean;
  supports_refunds: boolean;
  supports_webhooks: boolean;
  supports_manual_review: boolean;
  supports_partial_payments: boolean;
  supported_assets: string[];
}

export interface SettlementProvider {
  readonly providerId: SettlementProviderId;
  readonly manifest: SettlementCapabilityManifest;
  createSettlement(telegramUserId: bigint, dto: CreateSettlementSessionDto): Promise<unknown>;
  initializeSettlement(settlementId: string): Promise<unknown>;
  getSettlementStatus(settlementId: string): Promise<unknown>;
  verifySettlement(settlementId: string): Promise<unknown>;
  approveSettlement(settlementId: string, context?: Record<string, unknown>): Promise<unknown>;
  rejectSettlement(settlementId: string, reason?: string): Promise<unknown>;
  expireSettlement(settlementId: string): Promise<unknown>;
  cancelSettlement(settlementId: string): Promise<unknown>;
  getCapabilities(): SettlementCapabilityManifest;
  validateSettlement?(settlementId: string): Promise<unknown>;
  monitorSettlement?(settlementId: string): Promise<unknown>;
  emitSettlementEvent?(settlementId: string, eventType: string, payload?: Record<string, unknown>): Promise<unknown>;
}
