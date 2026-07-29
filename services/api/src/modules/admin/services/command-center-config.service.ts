import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

export interface MobileMoneyConfig {
  id: string;
  provider: string; // MTN, AIRTEL, MPESA
  country: string; // UG, KE, TZ
  currency: string; // UGX, KES, TZS
  phoneNumber: string;
  displayName: string;
  ussdTemplate: string; // *165*1*1*{phone}*{amount}#
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
  asset: string; // USDT, TON, BTC
  network: string; // TON, TRC20, ERC20
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

@Injectable()
export class CommandCenterConfigService {
  private readonly logger = new Logger(CommandCenterConfigService.name);

  private readonly mobileMoneyRegistry = new Map<string, MobileMoneyConfig>();
  private readonly cryptoWalletRegistry = new Map<string, CryptoWalletConfig>();
  private settings: CommandCenterSettings;

  constructor(private readonly prisma: PrismaService) {
    this.seedDefaultRegistries();
  }

  private seedDefaultRegistries() {
    // 1. Mobile Money Registry
    const mm1: MobileMoneyConfig = {
      id: 'mm_mtn_ug_escrow',
      provider: 'MTN',
      country: 'UG',
      currency: 'UGX',
      phoneNumber: '0771234567',
      displayName: 'TitanStream UG Escrow Pool 1',
      ussdTemplate: '*165*1*1*{phone}*{amount}#',
      priority: 1,
      dailyCapacityUsdt: 10000,
      status: 'ACTIVE',
      notes: 'Primary MTN Uganda receiving mobile money number',
      createdBy: 'SYSTEM_SUPER_ADMIN',
      updatedBy: 'SYSTEM_SUPER_ADMIN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mm2: MobileMoneyConfig = {
      id: 'mm_airtel_ug_escrow',
      provider: 'AIRTEL',
      country: 'UG',
      currency: 'UGX',
      phoneNumber: '0751234567',
      displayName: 'TitanStream UG Escrow Pool 2',
      ussdTemplate: '*185*9*{phone}*{amount}#',
      priority: 2,
      dailyCapacityUsdt: 10000,
      status: 'ACTIVE',
      notes: 'Primary Airtel Uganda receiving mobile money number',
      createdBy: 'SYSTEM_SUPER_ADMIN',
      updatedBy: 'SYSTEM_SUPER_ADMIN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.mobileMoneyRegistry.set(mm1.id, mm1);
    this.mobileMoneyRegistry.set(mm2.id, mm2);

    // 2. Crypto Wallet Registry
    const cw1: CryptoWalletConfig = {
      id: 'cw_usdt_ton_pool',
      asset: 'USDT',
      network: 'TON',
      address: 'EQD_titanstream_escrow_master_wallet_ton_001',
      label: 'TitanStream Master USDT (TON) Escrow Pool',
      status: 'ACTIVE',
      priority: 1,
      dailyCapacityUsdt: 50000,
      notes: 'Main receiving wallet for TON Jetton USDT',
      createdBy: 'SYSTEM_SUPER_ADMIN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.cryptoWalletRegistry.set(cw1.id, cw1);

    // 3. System Settings
    this.settings = {
      machineCatalog: [
        { tierCode: 'T1_MINI', name: 'Starter Node (T1)', priceUsdt: 10.0, capacityGhs: 5.0, powerRatingW: 50, dailyYieldEstimateUsdt: 0.25, isActive: true },
        { tierCode: 'T2_PRO', name: 'Pro Compute Node (T2)', priceUsdt: 50.0, capacityGhs: 25.0, powerRatingW: 250, dailyYieldEstimateUsdt: 1.40, isActive: true },
        { tierCode: 'T3_ENTERPRISE', name: 'Enterprise Cluster (T3)', priceUsdt: 200.0, capacityGhs: 120.0, powerRatingW: 1000, dailyYieldEstimateUsdt: 6.20, isActive: true },
        { tierCode: 'T4_QUANTUM', name: 'Quantum Cluster (T4)', priceUsdt: 1000.0, capacityGhs: 650.0, powerRatingW: 5000, dailyYieldEstimateUsdt: 34.0, isActive: true },
      ],
      treasuryPolicies: {
        minDepositUsdt: 1.0,
        maxDepositUsdt: 5000.0,
        minWithdrawalUsdt: 5.0,
        maxWithdrawalUsdt: 2500.0,
        targetReserveRatioPercent: 148,
        manualReviewThresholdUsdt: 500.0,
      },
      featureFlags: {
        enableUssdAutoDial: true,
        enableCryptoBotDeposit: true,
        enableInstantWithdrawal: true,
        enableMiningClaims: true,
        enableReferralRewards: true,
      },
      referralRules: {
        tier1BonusPercent: 5.0,
        tier2BonusPercent: 2.0,
        signupRewardCrystals: 5,
      },
      countrySettings: {
        UG: { enabled: true, exchangeRateUsdt: 3700, defaultCurrency: 'UGX' },
        KE: { enabled: true, exchangeRateUsdt: 130.5, defaultCurrency: 'KES' },
        TZ: { enabled: true, exchangeRateUsdt: 2600, defaultCurrency: 'TZS' },
      },
    };
  }

  // ─── MOBILE MONEY REGISTRY ──────────────────────────────────────────────────

  getMobileMoneyRegistry(): MobileMoneyConfig[] {
    return Array.from(this.mobileMoneyRegistry.values()).sort((a, b) => a.priority - b.priority);
  }

  upsertMobileMoneyConfig(dto: Partial<MobileMoneyConfig>, adminId: string): MobileMoneyConfig {
    const id = dto.id || `mm_${dto.provider?.toLowerCase()}_${dto.country?.toLowerCase()}_${Date.now()}`;
    const existing = this.mobileMoneyRegistry.get(id);

    const config: MobileMoneyConfig = {
      id,
      provider: dto.provider || existing?.provider || 'MTN',
      country: dto.country || existing?.country || 'UG',
      currency: dto.currency || existing?.currency || 'UGX',
      phoneNumber: dto.phoneNumber || existing?.phoneNumber || '0770000000',
      displayName: dto.displayName || existing?.displayName || 'TitanStream Escrow Pool',
      ussdTemplate: dto.ussdTemplate || existing?.ussdTemplate || '*165*1*1*{phone}*{amount}#',
      priority: dto.priority ?? existing?.priority ?? 1,
      dailyCapacityUsdt: dto.dailyCapacityUsdt ?? existing?.dailyCapacityUsdt ?? 5000,
      status: dto.status || existing?.status || 'ACTIVE',
      notes: dto.notes ?? existing?.notes,
      createdBy: existing?.createdBy || adminId,
      updatedBy: adminId,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.mobileMoneyRegistry.set(id, config);
    this.logger.log(`[CommandCenterConfig] Mobile money receiving config ${id} updated by ${adminId}`);
    return config;
  }

  // ─── CRYPTO WALLET REGISTRY ────────────────────────────────────────────────

  getCryptoWalletRegistry(): CryptoWalletConfig[] {
    return Array.from(this.cryptoWalletRegistry.values()).sort((a, b) => a.priority - b.priority);
  }

  upsertCryptoWalletConfig(dto: Partial<CryptoWalletConfig>, adminId: string): CryptoWalletConfig {
    const id = dto.id || `cw_${dto.asset?.toLowerCase()}_${Date.now()}`;
    const existing = this.cryptoWalletRegistry.get(id);

    const config: CryptoWalletConfig = {
      id,
      asset: dto.asset || existing?.asset || 'USDT',
      network: dto.network || existing?.network || 'TON',
      address: dto.address || existing?.address || 'EQD_titanstream_escrow',
      label: dto.label || existing?.label || 'TitanStream Crypto Escrow',
      qrCodeUrl: dto.qrCodeUrl ?? existing?.qrCodeUrl,
      status: dto.status || existing?.status || 'ACTIVE',
      priority: dto.priority ?? existing?.priority ?? 1,
      dailyCapacityUsdt: dto.dailyCapacityUsdt ?? existing?.dailyCapacityUsdt ?? 50000,
      notes: dto.notes ?? existing?.notes,
      createdBy: existing?.createdBy || adminId,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.cryptoWalletRegistry.set(id, config);
    return config;
  }

  // ─── USSD TEMPLATE ENGINE & PREVIEW ──────────────────────────────────────────

  testUssdTemplate(template: string, phone: string, amount: number) {
    if (!template.includes('{phone}') || !template.includes('{amount}')) {
      throw new BadRequestException('USSD template must contain both {phone} and {amount} placeholders.');
    }

    const generatedUssd = template
      .replace('{phone}', phone)
      .replace('{amount}', Math.round(amount).toString());

    const telUri = `tel:${generatedUssd.replace('#', '%23')}`;

    return {
      template,
      phone,
      amount,
      generatedUssd,
      telUri,
      isValid: true,
    };
  }

  // ─── SYSTEM SETTINGS ────────────────────────────────────────────────────────

  getSettings(): CommandCenterSettings {
    return this.settings;
  }

  updateSettings(patch: Partial<CommandCenterSettings>): CommandCenterSettings {
    this.settings = {
      ...this.settings,
      ...patch,
      treasuryPolicies: { ...this.settings.treasuryPolicies, ...patch.treasuryPolicies },
      featureFlags: { ...this.settings.featureFlags, ...patch.featureFlags },
      referralRules: { ...this.settings.referralRules, ...patch.referralRules },
    };
    return this.settings;
  }
}
