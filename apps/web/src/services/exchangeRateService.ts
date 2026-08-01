import { api } from './api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExchangeRate {
  currencyCode: string;      // e.g. 'UGX'
  baseRate: number;          // Raw market rate
  appliedRate: number;       // After spread/margin
  userRate: number;          // What the user sees
  spread: number;            // Spread percentage applied
  timestamp: string;         // When this rate was fetched
  source: string;            // Rate source (e.g. 'coingecko', 'binance_p2p')
}

export interface ExchangeRatesResponse {
  rates: ExchangeRate[];
  baseCurrency: string;      // Always 'USDT'
  updatedAt: string;
}

// ─── Production Exchange Rate Service ────────────────────────────────────────
// Fetches live rates from the backend. No static values.
// Backend caches rates with configurable TTL and applies spread per country.

export const exchangeRateService = {
  /**
   * Fetch current exchange rates for all supported currencies.
   * Backend endpoint: GET /financial/exchange-rates
   */
  async getRates(): Promise<ExchangeRatesResponse> {
    const response = await api.get('/financial/exchange-rates');
    return response.data.data;
  },

  /**
   * Fetch exchange rate for a specific currency.
   * Backend endpoint: GET /financial/exchange-rate/:currencyCode
   */
  async getRate(currencyCode: string): Promise<ExchangeRate> {
    const response = await api.get(`/financial/exchange-rate/${currencyCode}`);
    return response.data.data;
  },

  /**
   * Calculate local currency amount from USDT using live rate.
   * Used at settlement creation time to lock in the rate.
   */
  async calculateLocalAmount(usdtAmount: number, currencyCode: string): Promise<{
    localAmount: number;
    rateUsed: number;
    rateTimestamp: string;
  }> {
    const rate = await exchangeRateService.getRate(currencyCode);
    return {
      localAmount: usdtAmount * rate.userRate,
      rateUsed: rate.userRate,
      rateTimestamp: rate.timestamp,
    };
  },
};
