import { api } from './api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CapabilityManifest {
  provider: string;
  supports_buy: boolean;
  supports_sell: boolean;
  supports_refunds: boolean;
  supports_webhooks: boolean;
  supports_manual_review: boolean;
  supports_partial_payments: boolean;
  supported_assets: string[];
}

export interface SettlementProviderItem {
  provider: string;
  name: string;
  displayName: string;
  type: string;
  status: string;
  healthStatus: string;
  priority: number;
  supported_assets: string[];
  supported_countries?: string[];
  capabilities?: CapabilityManifest;
  capabilityManifest?: CapabilityManifest;
}

export interface CreateSettlementPayload {
  provider: string;
  asset: string;
  requestedAmount: string;
  expectedCryptoAmount: string;
  exchangeRate: string;
  country?: string;
  mobileMoneyNetwork?: string;
}

export interface SettlementSessionView {
  settlementId: string;
  provider: string;
  reference?: string;
  referenceCode?: string;
  asset: string;
  amount?: string;
  requestedAmount?: string;
  expectedAssetAmount?: string;
  expectedCryptoAmount?: string;
  exchangeRate?: string;
  status: string;
  expiresAt: string;
  createdAt?: string;
  updatedAt?: string;
  secondsRemaining?: number;
  mobileMoneyNumber?: string;
  paymentUrl?: string;
}

// ─── Production Settlement Service ───────────────────────────────────────────
// Every method calls the real backend API.
// No mock data. No fallback data. Real errors on failure.

export const settlementService = {
  /**
   * Fetch available settlement providers from the backend.
   * Backend endpoint: GET /settlement/providers
   */
  async getProviders(params?: { asset?: string; country?: string }): Promise<SettlementProviderItem[]> {
    const response = await api.get('/settlement/providers', { params });
    return response.data.data;
  },

  /**
   * Create a new settlement session.
   * Backend endpoint: POST /settlement/session
   * Creates a real database record. Returns real provider data (invoice URL, reference code, etc.)
   */
  async createSession(payload: CreateSettlementPayload): Promise<SettlementSessionView> {
    const response = await api.post('/settlement/session', payload);
    return response.data.data;
  },

  /**
   * Get a specific settlement session by ID.
   * Backend endpoint: GET /settlement/session/:id
   */
  async getSession(settlementId: string): Promise<SettlementSessionView> {
    const response = await api.get(`/settlement/session/${settlementId}`);
    return response.data.data;
  },

  /**
   * Cancel an active settlement session.
   * Backend endpoint: POST /settlement/session/:id/cancel
   */
  async cancelSession(settlementId: string): Promise<SettlementSessionView> {
    const response = await api.post(`/settlement/session/${settlementId}/cancel`);
    return response.data.data;
  },

  /**
   * Get settlement history for the current user.
   * Backend endpoint: GET /settlement/history
   */
  async getHistory(): Promise<SettlementSessionView[]> {
    const response = await api.get('/settlement/history');
    return response.data.data;
  },
};
