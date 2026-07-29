import { Injectable, Logger } from '@nestjs/common';

// ─── Exchange Rate Service ───────────────────────────────────────────────────
// Retrieves live rates, caches them, applies spread/margin, and records the
// rate used for each settlement for auditability.

export interface CachedRate {
  baseRate: number;
  appliedRate: number;
  userRate: number;
  spread: number;
  fetchedAt: Date;
  source: string;
}

interface CountrySpreadConfig {
  currencyCode: string;
  spreadPercent: number;    // e.g. 2.0 means 2% spread
  fallbackRate: number;     // Used only if API is unreachable
}

const COUNTRY_SPREADS: Record<string, CountrySpreadConfig> = {
  UGX: { currencyCode: 'UGX', spreadPercent: 2.5, fallbackRate: 3700 },
  KES: { currencyCode: 'KES', spreadPercent: 2.0, fallbackRate: 130 },
  NGN: { currencyCode: 'NGN', spreadPercent: 3.0, fallbackRate: 1600 },
  GHS: { currencyCode: 'GHS', spreadPercent: 2.5, fallbackRate: 15.5 },
  TZS: { currencyCode: 'TZS', spreadPercent: 2.5, fallbackRate: 2700 },
  GBP: { currencyCode: 'GBP', spreadPercent: 0.5, fallbackRate: 0.78 },
  EUR: { currencyCode: 'EUR', spreadPercent: 0.5, fallbackRate: 0.92 },
  USD: { currencyCode: 'USD', spreadPercent: 0.0, fallbackRate: 1.0 },
};

const CACHE_TTL_MS = 60_000; // 60 seconds

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private cache: Map<string, CachedRate> = new Map();

  /**
   * Get the current exchange rate for a currency.
   * Caches the result. On cache miss, fetches live from external API.
   */
  async getRate(currencyCode: string): Promise<CachedRate> {
    const cached = this.cache.get(currencyCode);
    if (cached && (Date.now() - cached.fetchedAt.getTime()) < CACHE_TTL_MS) {
      return cached;
    }
    return this.fetchAndCache(currencyCode);
  }

  /**
   * Get rates for all supported currencies.
   */
  async getAllRates(): Promise<{ rates: CachedRate[]; baseCurrency: string; updatedAt: string }> {
    const codes = Object.keys(COUNTRY_SPREADS);
    const rates = await Promise.all(codes.map((code) => this.getRate(code)));
    return {
      rates,
      baseCurrency: 'USDT',
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Record the rate used for a specific settlement.
   * Returns the rate snapshot that should be stored with the settlement.
   */
  async lockRateForSettlement(currencyCode: string): Promise<{
    baseRate: number;
    appliedRate: number;
    userRate: number;
    rateTimestamp: string;
    source: string;
  }> {
    const rate = await this.getRate(currencyCode);
    return {
      baseRate: rate.baseRate,
      appliedRate: rate.appliedRate,
      userRate: rate.userRate,
      rateTimestamp: rate.fetchedAt.toISOString(),
      source: rate.source,
    };
  }

  /**
   * Fetch live rate from external API and cache it.
   */
  private async fetchAndCache(currencyCode: string): Promise<CachedRate> {
    const config = COUNTRY_SPREADS[currencyCode];
    if (!config) {
      // Unknown currency — return 1:1
      const rate: CachedRate = {
        baseRate: 1,
        appliedRate: 1,
        userRate: 1,
        spread: 0,
        fetchedAt: new Date(),
        source: 'fallback',
      };
      this.cache.set(currencyCode, rate);
      return rate;
    }

    let baseRate = config.fallbackRate;
    let source = 'fallback';

    try {
      // Primary: CoinGecko simple price API (free, no key required)
      // USDT → USD is approximately 1:1, so we convert USD → local currency
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=${currencyCode.toLowerCase()}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (response.ok) {
        const data = await response.json();
        const cgRate = data?.tether?.[currencyCode.toLowerCase()];
        if (cgRate && typeof cgRate === 'number' && cgRate > 0) {
          baseRate = cgRate;
          source = 'coingecko';
        }
      }
    } catch (err: any) {
      this.logger.warn(`CoinGecko rate fetch failed for ${currencyCode}: ${err?.message}. Using fallback rate.`);
    }

    // Apply spread
    const spreadMultiplier = 1 + (config.spreadPercent / 100);
    const appliedRate = baseRate * spreadMultiplier;
    const userRate = appliedRate;

    const rate: CachedRate = {
      baseRate,
      appliedRate,
      userRate,
      spread: config.spreadPercent,
      fetchedAt: new Date(),
      source,
    };

    this.cache.set(currencyCode, rate);
    this.logger.log(`[ExchangeRate] ${currencyCode}: base=${baseRate}, applied=${appliedRate} (${config.spreadPercent}% spread), source=${source}`);
    return rate;
  }
}
