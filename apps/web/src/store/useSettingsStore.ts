import { create } from 'zustand';

export interface SettingsState {
  language: string;
  theme: 'dark';
  setLanguage: (lang: string) => void;

  // Currency & Location Preferences
  preferLocalCurrency: boolean;
  userCountry: string;
  userCurrency: string;
  currencySymbol: string;
  currencyRate: number;
  setCurrencyPreference: (
    preferLocal: boolean,
    country: string,
    currency: string,
    symbol: string,
    rate: number
  ) => void;

  // Admin Payment Receiving Phone Numbers
  adminPhoneNumbers: string[];
  activeAdminPhone: string;
  setActiveAdminPhone: (phone: string) => void;
  addAdminPhoneNumber: (phone: string) => void;
  removeAdminPhoneNumber: (phone: string) => void;

  // Global Emergency Kill Switches
  pauseDeposits: boolean;
  pauseWithdrawals: boolean;
  maintenanceMode: boolean;
  toggleKillSwitch: (key: 'pauseDeposits' | 'pauseWithdrawals' | 'maintenanceMode') => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language: 'en',
  theme: 'dark',
  setLanguage: (language) => set({ language }),

  preferLocalCurrency: false,
  userCountry: 'United States',
  userCurrency: 'USDT',
  currencySymbol: '₮',
  currencyRate: 1.0,
  setCurrencyPreference: (preferLocal, country, currency, symbol, rate) =>
    set({
      preferLocalCurrency: preferLocal,
      userCountry: country,
      userCurrency: currency,
      currencySymbol: symbol,
      currencyRate: rate,
    }),

  adminPhoneNumbers: ['0771234567', '0789012345', '0701122334'],
  activeAdminPhone: '0771234567',
  setActiveAdminPhone: (phone) => set({ activeAdminPhone: phone }),
  addAdminPhoneNumber: (phone) =>
    set((state) => ({
      adminPhoneNumbers: [...state.adminPhoneNumbers.filter((p) => p !== phone), phone],
      activeAdminPhone: phone,
    })),
  removeAdminPhoneNumber: (phone) =>
    set((state) => {
      const filtered = state.adminPhoneNumbers.filter((p) => p !== phone);
      return {
        adminPhoneNumbers: filtered,
        activeAdminPhone: state.activeAdminPhone === phone ? filtered[0] || '' : state.activeAdminPhone,
      };
    }),

  pauseDeposits: false,
  pauseWithdrawals: false,
  maintenanceMode: false,
  toggleKillSwitch: (key) =>
    set((state) => ({
      [key]: !state[key],
    })),
}));



