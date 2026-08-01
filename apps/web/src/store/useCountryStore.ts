import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSettingsStore } from './useSettingsStore';

// ─── Country Configuration ───────────────────────────────────────────────────
// No country-specific values are hardcoded in components.
// All country data is read from this centralized config.

export interface CountryConfig {
  code: string;              // ISO 3166-1 alpha-2 (e.g. 'UG')
  name: string;              // 'Uganda'
  flag: string;              // '🇺🇬'
  currencyCode: string;      // 'UGX'
  currencySymbol: string;    // 'USh'
  exchangeRate: number;      // UGX per 1 USDT
  numberFormat: Intl.NumberFormatOptions;
  mobilePaymentMethods: string[];
  depositLimits: { min: number; max: number };   // in USDT
  withdrawalLimits: { min: number; max: number };
  defaultLanguage: string;
  timezone: string;
  helpExamples: {
    machinePrice: string;
    walletBalance: string;
    dailyReward: string;
  };
  settlementProviders: string[];
}

export const SUPPORTED_COUNTRIES: CountryConfig[] = [
  {
    code: 'UG',
    name: 'Uganda',
    flag: '🇺🇬',
    currencyCode: 'UGX',
    currencySymbol: 'USh',
    exchangeRate: 3700,
    numberFormat: { maximumFractionDigits: 0 },
    mobilePaymentMethods: ['MTN Mobile Money', 'Airtel Money'],
    depositLimits: { min: 5, max: 5000 },
    withdrawalLimits: { min: 2, max: 2000 },
    defaultLanguage: 'en',
    timezone: 'Africa/Kampala',
    helpExamples: {
      machinePrice: '100 USDT ≈ USh 370,000',
      walletBalance: '52.30 USDT ≈ USh 193,510',
      dailyReward: '0.42 USDT ≈ USh 1,554',
    },
    settlementProviders: ['MTN MoMo', 'Airtel Money'],
  },
  {
    code: 'KE',
    name: 'Kenya',
    flag: '🇰🇪',
    currencyCode: 'KES',
    currencySymbol: 'KSh',
    exchangeRate: 130,
    numberFormat: { maximumFractionDigits: 0 },
    mobilePaymentMethods: ['M-Pesa', 'Airtel Money'],
    depositLimits: { min: 5, max: 5000 },
    withdrawalLimits: { min: 2, max: 2000 },
    defaultLanguage: 'en',
    timezone: 'Africa/Nairobi',
    helpExamples: {
      machinePrice: '100 USDT ≈ KSh 13,000',
      walletBalance: '52.30 USDT ≈ KSh 6,799',
      dailyReward: '0.42 USDT ≈ KSh 54.60',
    },
    settlementProviders: ['M-Pesa', 'Airtel Money'],
  },
  {
    code: 'NG',
    name: 'Nigeria',
    flag: '🇳🇬',
    currencyCode: 'NGN',
    currencySymbol: '₦',
    exchangeRate: 1600,
    numberFormat: { maximumFractionDigits: 0 },
    mobilePaymentMethods: ['OPay', 'PalmPay', 'Bank Transfer'],
    depositLimits: { min: 5, max: 5000 },
    withdrawalLimits: { min: 2, max: 2000 },
    defaultLanguage: 'en',
    timezone: 'Africa/Lagos',
    helpExamples: {
      machinePrice: '100 USDT ≈ ₦160,000',
      walletBalance: '52.30 USDT ≈ ₦83,680',
      dailyReward: '0.42 USDT ≈ ₦672',
    },
    settlementProviders: ['OPay', 'PalmPay', 'Bank Transfer'],
  },
  {
    code: 'GH',
    name: 'Ghana',
    flag: '🇬🇭',
    currencyCode: 'GHS',
    currencySymbol: 'GH₵',
    exchangeRate: 15.5,
    numberFormat: { maximumFractionDigits: 2 },
    mobilePaymentMethods: ['MTN MoMo', 'Vodafone Cash', 'AirtelTigo Money'],
    depositLimits: { min: 5, max: 5000 },
    withdrawalLimits: { min: 2, max: 2000 },
    defaultLanguage: 'en',
    timezone: 'Africa/Accra',
    helpExamples: {
      machinePrice: '100 USDT ≈ GH₵1,550',
      walletBalance: '52.30 USDT ≈ GH₵810.65',
      dailyReward: '0.42 USDT ≈ GH₵6.51',
    },
    settlementProviders: ['MTN MoMo', 'Vodafone Cash'],
  },
  {
    code: 'TZ',
    name: 'Tanzania',
    flag: '🇹🇿',
    currencyCode: 'TZS',
    currencySymbol: 'TSh',
    exchangeRate: 2700,
    numberFormat: { maximumFractionDigits: 0 },
    mobilePaymentMethods: ['M-Pesa', 'Tigo Pesa', 'Airtel Money'],
    depositLimits: { min: 5, max: 5000 },
    withdrawalLimits: { min: 2, max: 2000 },
    defaultLanguage: 'en',
    timezone: 'Africa/Dar_es_Salaam',
    helpExamples: {
      machinePrice: '100 USDT ≈ TSh 270,000',
      walletBalance: '52.30 USDT ≈ TSh 141,210',
      dailyReward: '0.42 USDT ≈ TSh 1,134',
    },
    settlementProviders: ['M-Pesa', 'Tigo Pesa', 'Airtel Money'],
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    currencyCode: 'GBP',
    currencySymbol: '£',
    exchangeRate: 0.78,
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    mobilePaymentMethods: ['Bank Transfer', 'Apple Pay'],
    depositLimits: { min: 10, max: 10000 },
    withdrawalLimits: { min: 5, max: 5000 },
    defaultLanguage: 'en',
    timezone: 'Europe/London',
    helpExamples: {
      machinePrice: '100 USDT ≈ £78.00',
      walletBalance: '52.30 USDT ≈ £40.79',
      dailyReward: '0.42 USDT ≈ £0.33',
    },
    settlementProviders: ['Bank Transfer'],
  },
  {
    code: 'EU',
    name: 'Europe',
    flag: '🇪🇺',
    currencyCode: 'EUR',
    currencySymbol: '€',
    exchangeRate: 0.92,
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    mobilePaymentMethods: ['SEPA Transfer', 'Apple Pay'],
    depositLimits: { min: 10, max: 10000 },
    withdrawalLimits: { min: 5, max: 5000 },
    defaultLanguage: 'en',
    timezone: 'Europe/Berlin',
    helpExamples: {
      machinePrice: '100 USDT ≈ €92.00',
      walletBalance: '52.30 USDT ≈ €48.12',
      dailyReward: '0.42 USDT ≈ €0.39',
    },
    settlementProviders: ['SEPA Transfer'],
  },
  {
    code: 'RW',
    name: 'Rwanda',
    flag: '🇷🇼',
    currencyCode: 'RWF',
    currencySymbol: 'RFR',
    exchangeRate: 1350,
    numberFormat: { maximumFractionDigits: 0 },
    mobilePaymentMethods: ['MTN Mobile Money', 'Airtel Money'],
    depositLimits: { min: 5, max: 5000 },
    withdrawalLimits: { min: 2, max: 2000 },
    defaultLanguage: 'en',
    timezone: 'Africa/Kigali',
    helpExamples: {
      machinePrice: '100 USDT ≈ RFR 135,000',
      walletBalance: '52.30 USDT ≈ RFR 70,605',
      dailyReward: '0.42 USDT ≈ RFR 567',
    },
    settlementProviders: ['MTN MoMo', 'Airtel Money'],
  },
  {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    currencyCode: 'USD',
    currencySymbol: '$',
    exchangeRate: 1.0,
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    mobilePaymentMethods: ['CryptoBot', 'USDT Wallet'],
    depositLimits: { min: 10, max: 50000 },
    withdrawalLimits: { min: 5, max: 25000 },
    defaultLanguage: 'en',
    timezone: 'America/New_York',
    helpExamples: {
      machinePrice: '100 USDT ≈ $100.00',
      walletBalance: '52.30 USDT ≈ $52.30',
      dailyReward: '0.42 USDT ≈ $0.42',
    },
    settlementProviders: ['CryptoBot', 'USDT Wallet'],
  },
];

// Dual & Triple currency formatting utilities (UGX, RWF, USDT)
export const UGX_EXCHANGE_RATE = 3700;
export const RWF_EXCHANGE_RATE = 1350;

export const formatUgx = (usdtAmount: number): string => {
  const safeUsdt = Number(usdtAmount) || 0;
  const ugx = Math.round(safeUsdt * UGX_EXCHANGE_RATE);
  return `UGX ${ugx.toLocaleString()}`;
};

export const formatRwf = (usdtAmount: number): string => {
  const safeUsdt = Number(usdtAmount) || 0;
  const rwf = Math.round(safeUsdt * RWF_EXCHANGE_RATE);
  return `RWF ${rwf.toLocaleString()}`;
};

export const formatUsdt = (usdtAmount: number): string => {
  const safeUsdt = Number(usdtAmount) || 0;
  return `${safeUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
};

export interface DualCurrencyYield {
  local: string;
  usdt: string;
  formattedDisplay: string;
}

export const getDualCurrencyYield = (usdtAmount: number): DualCurrencyYield => {
  const store = useCountryStore.getState();
  const localStr = store.getLocalAmount(usdtAmount);
  const usdtStr = `≈ ${formatUsdt(usdtAmount)}`;
  return {
    local: localStr,
    usdt: usdtStr,
    formattedDisplay: `${localStr} (${usdtStr})`,
  };
};

export interface MultiCurrencyYield {
  ugx: string;
  rwf: string;
  usdt: string;
  formattedDisplay: string;
}

export const getMultiCurrencyYield = (usdtAmount: number): MultiCurrencyYield => {
  const ugxStr = formatUgx(usdtAmount);
  const rwfStr = formatRwf(usdtAmount);
  const usdtStr = formatUsdt(usdtAmount);
  return {
    ugx: ugxStr,
    rwf: rwfStr,
    usdt: usdtStr,
    formattedDisplay: `${ugxStr} • ${rwfStr} (${usdtStr})`,
  };
};

// ─── Store ───────────────────────────────────────────────────────────────────

interface CountryState {
  selectedCountry: CountryConfig | null;
  hasSelectedCountry: boolean;

  // Actions
  selectCountry: (code: string) => void;
  getLocalAmount: (usdtAmount: number) => string;
  getLocalAmountRaw: (usdtAmount: number) => number;
  clearCountry: () => void;
}

export const useCountryStore = create<CountryState>()(
  persist(
    (set, get) => ({
      selectedCountry: null,
      hasSelectedCountry: false,

      selectCountry: (code: string) => {
        const country = SUPPORTED_COUNTRIES.find((c) => c.code === code);
        if (country) {
          set({ selectedCountry: country, hasSelectedCountry: true });
        }
      },

      getLocalAmount: (usdtAmount: number): string => {
        const safeUsdt = Number(usdtAmount) || 0;
        const preferLocal = useSettingsStore.getState().preferLocalCurrency;
        const { selectedCountry } = get();
        if (!preferLocal || !selectedCountry || selectedCountry.code === 'US') {
          return `$${safeUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        const localValue = safeUsdt * (Number(selectedCountry.exchangeRate) || 1);
        const fmt = selectedCountry.numberFormat && typeof selectedCountry.numberFormat === 'object'
          ? selectedCountry.numberFormat
          : { maximumFractionDigits: 0 };
        return `${selectedCountry.currencySymbol || ''} ${localValue.toLocaleString(undefined, fmt)}`;
      },

      getLocalAmountRaw: (usdtAmount: number): number => {
        const safeUsdt = Number(usdtAmount) || 0;
        const preferLocal = useSettingsStore.getState().preferLocalCurrency;
        const { selectedCountry } = get();
        if (!preferLocal || !selectedCountry) return safeUsdt;
        return safeUsdt * (Number(selectedCountry.exchangeRate) || 1);
      },

      clearCountry: () => set({ selectedCountry: null, hasSelectedCountry: false }),
    }),
    {
      name: 'country-storage',
      partialize: (state) => ({
        selectedCountry: state.selectedCountry,
        hasSelectedCountry: state.hasSelectedCountry,
      }),
    }
  )
);
