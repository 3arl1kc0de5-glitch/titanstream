import { settlementService, type CreateSettlementPayload, type SettlementSessionView, type SettlementProviderItem } from './settlementService';

// ─── Unified Funding Interface ───────────────────────────────────────────────
// The frontend should only ever interact with this service.
// Whether the provider is CryptoBot, Merchant, or anything else is invisible.
// Provider-specific complexity lives entirely behind the settlement layer.

export interface FundingSession {
  sessionId: string;
  provider: string;
  paymentUrl?: string;
  paymentReference: string;
  amount: string;
  expectedCryptoAmount: string;
  exchangeRate: string;
  status: string;
  expiresAt: string;
  secondsRemaining?: number;
  mobileMoneyNumber?: string;
}

export interface FundingProvider {
  id: string;
  name: string;
  displayName: string;
  type: string;
  status: string;
  healthStatus: string;
  supportedAssets: string[];
  supportedCountries?: string[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const fundingService = {
  /**
   * List available funding providers.
   * The frontend displays these as payment method options.
   */
  async getProviders(params?: { asset?: string; country?: string }): Promise<FundingProvider[]> {
    const raw = await settlementService.getProviders(params);
    return raw.map(toFundingProvider);
  },

  /**
   * Create a new funding session.
   * Returns a provider-independent session with payment URL, reference, status.
   * The frontend never needs to know which provider is being used.
   */
  async createSession(params: {
    provider: string;
    asset: string;
    amount: string;
    exchangeRate?: string;
    country?: string;
    mobileMoneyNetwork?: string;
  }): Promise<FundingSession> {
    const payload: CreateSettlementPayload = {
      provider: params.provider,
      asset: params.asset,
      requestedAmount: params.amount,
      expectedCryptoAmount: params.amount, // For crypto providers, 1:1. For fiat, backend calculates.
      exchangeRate: params.exchangeRate || '1.0',
      country: params.country,
      mobileMoneyNetwork: params.mobileMoneyNetwork,
    };
    const raw = await settlementService.createSession(payload);
    return toFundingSession(raw);
  },

  /**
   * Get current status of a funding session.
   * Use this for polling during payment confirmation.
   */
  async getSession(sessionId: string): Promise<FundingSession> {
    const raw = await settlementService.getSession(sessionId);
    return toFundingSession(raw);
  },

  /**
   * Cancel an active funding session.
   */
  async cancelSession(sessionId: string): Promise<FundingSession> {
    const raw = await settlementService.cancelSession(sessionId);
    return toFundingSession(raw);
  },

  /**
   * Get funding history for the current user.
   */
  async getHistory(): Promise<FundingSession[]> {
    const raw = await settlementService.getHistory();
    return raw.map(toFundingSession);
  },
};

// ─── Mappers ─────────────────────────────────────────────────────────────────

function toFundingSession(raw: SettlementSessionView): FundingSession {
  return {
    sessionId: raw.settlementId,
    provider: raw.provider,
    paymentUrl: raw.paymentUrl,
    paymentReference: raw.referenceCode || raw.reference || raw.settlementId,
    amount: raw.requestedAmount || raw.amount || '0',
    expectedCryptoAmount: raw.expectedCryptoAmount || raw.expectedAssetAmount || '0',
    exchangeRate: raw.exchangeRate || '1.0',
    status: raw.status,
    expiresAt: raw.expiresAt,
    secondsRemaining: raw.secondsRemaining,
    mobileMoneyNumber: raw.mobileMoneyNumber,
  };
}

function toFundingProvider(raw: SettlementProviderItem): FundingProvider {
  return {
    id: raw.provider,
    name: raw.name,
    displayName: raw.displayName,
    type: raw.type,
    status: raw.status,
    healthStatus: raw.healthStatus,
    supportedAssets: raw.supported_assets,
    supportedCountries: raw.supported_countries,
  };
}
