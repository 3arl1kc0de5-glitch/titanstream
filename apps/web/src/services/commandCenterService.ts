import { api } from './api';

export interface MobileMoneyConfig {
  id: string;
  provider: string;
  country: string;
  currency: string;
  phoneNumber: string;
  displayName: string;
  ussdTemplate: string;
  priority: number;
  dailyCapacityUsdt: number;
  status: 'ACTIVE' | 'PAUSED' | 'DISABLED' | 'ARCHIVED';
  notes?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CryptoWalletConfig {
  id: string;
  asset: string;
  network: string;
  address: string;
  label: string;
  qrCodeUrl?: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'DISABLED';
  priority: number;
  dailyCapacityUsdt: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UssdTestResult {
  template: string;
  phone: string;
  amount: number;
  generatedUssd: string;
  telUri: string;
  isValid: boolean;
}

export interface CommandCenterSettings {
  machineCatalog: Array<{
    tierCode: string;
    name: string;
    priceUsdt: number;
    capacityGhs: number;
    powerRatingW: number;
    dailyYieldEstimateUsdt: number;
    isActive: boolean;
  }>;
  treasuryPolicies: {
    minDepositUsdt: number;
    maxDepositUsdt: number;
    minWithdrawalUsdt: number;
    maxWithdrawalUsdt: number;
    targetReserveRatioPercent: number;
    manualReviewThresholdUsdt: number;
  };
  featureFlags: {
    enableUssdAutoDial: boolean;
    enableCryptoBotDeposit: boolean;
    enableInstantWithdrawal: boolean;
    enableMiningClaims: boolean;
    enableReferralRewards: boolean;
  };
  referralRules: {
    tier1BonusPercent: number;
    tier2BonusPercent: number;
    signupRewardCrystals: number;
  };
  countrySettings: Record<string, { enabled: boolean; exchangeRateUsdt: number; defaultCurrency: string }>;
}

export interface AdminAccountRecord {
  id: string;
  telegramUserId: string;
  name: string;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  permissions: string[];
  lastLoginAt: string;
  createdAt: string;
}

export const commandCenterService = {
  async getMobileMoneyRegistry(): Promise<MobileMoneyConfig[]> {
    const res = await api.get('/admin/config/mobile-money');
    return res.data.data;
  },

  async upsertMobileMoney(dto: Partial<MobileMoneyConfig>): Promise<MobileMoneyConfig> {
    const res = await api.post('/admin/config/mobile-money', dto);
    return res.data.data;
  },

  async getCryptoWalletRegistry(): Promise<CryptoWalletConfig[]> {
    const res = await api.get('/admin/config/crypto-wallets');
    return res.data.data;
  },

  async upsertCryptoWallet(dto: Partial<CryptoWalletConfig>): Promise<CryptoWalletConfig> {
    const res = await api.post('/admin/config/crypto-wallets', dto);
    return res.data.data;
  },

  async testUssdTemplate(template: string, phone: string, amount: number): Promise<UssdTestResult> {
    const res = await api.post('/admin/config/ussd/preview', { template, phone, amount });
    return res.data.data;
  },

  async getSettings(): Promise<CommandCenterSettings> {
    const res = await api.get('/admin/config/settings');
    return res.data.data;
  },

  async updateSettings(patch: Partial<CommandCenterSettings>): Promise<CommandCenterSettings> {
    const res = await api.post('/admin/config/settings', patch);
    return res.data.data;
  },

  async getAdminAccounts(): Promise<AdminAccountRecord[]> {
    const res = await api.get('/admin/management/admins');
    return res.data.data;
  },

  async inviteAdmin(telegramUserId: string, name: string, role: string): Promise<AdminAccountRecord> {
    const res = await api.post('/admin/management/invite', { telegramUserId, name, role });
    return res.data.data;
  },

  async updateAdminRole(id: string, role: string): Promise<AdminAccountRecord> {
    const res = await api.post(`/admin/management/${id}/role`, { role });
    return res.data.data;
  },

  async toggleAdminStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED'): Promise<AdminAccountRecord> {
    const res = await api.post(`/admin/management/${id}/status`, { status });
    return res.data.data;
  },
};
