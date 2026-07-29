import { create } from 'zustand';

export interface MerchantProfile {
  id: string;
  name: string;
  code: string;
  status: 'Active' | 'Busy' | 'Maintenance' | 'Offline';
  supportedCountries: string[];
  supportedPaymentMethods: string[];
  operatingHours: string;
  liquidityLimitUsdt: number;
  currentWorkload: number;
  completionRate: number; // e.g. 99.4%
  avgResponseTimeSec: number; // e.g. 18s
  totalSettledVolumeUsdt: number;
  totalEarningsUsdt: number;
}

interface MerchantState {
  merchants: MerchantProfile[];
  routingPolicy: 'HIGHEST_COMPLETION' | 'FASTEST_RESPONSE' | 'BALANCED_WORKLOAD';
  
  // Actions
  setRoutingPolicy: (policy: 'HIGHEST_COMPLETION' | 'FASTEST_RESPONSE' | 'BALANCED_WORKLOAD') => void;
  updateMerchantStatus: (id: string, status: MerchantProfile['status']) => void;
  registerMerchant: (merchant: Omit<MerchantProfile, 'id' | 'totalSettledVolumeUsdt' | 'totalEarningsUsdt'>) => void;
}

const INITIAL_MERCHANTS: MerchantProfile[] = [
  {
    id: 'merch-01',
    name: 'Kampala MoMo Liquidity Hub',
    code: 'MERCH-UG-01',
    status: 'Active',
    supportedCountries: ['Uganda'],
    supportedPaymentMethods: ['MTN Mobile Money', 'Airtel Money'],
    operatingHours: '24/7 Auto-Settlement',
    liquidityLimitUsdt: 50000,
    currentWorkload: 4,
    completionRate: 99.6,
    avgResponseTimeSec: 12,
    totalSettledVolumeUsdt: 248900,
    totalEarningsUsdt: 2489.0,
  },
  {
    id: 'merch-02',
    name: 'Nairobi M-Pesa Direct Rail',
    code: 'MERCH-KE-01',
    status: 'Active',
    supportedCountries: ['Kenya'],
    supportedPaymentMethods: ['M-Pesa', 'Airtel Money'],
    operatingHours: '24/7 Auto-Settlement',
    liquidityLimitUsdt: 75000,
    currentWorkload: 7,
    completionRate: 98.9,
    avgResponseTimeSec: 15,
    totalSettledVolumeUsdt: 312000,
    totalEarningsUsdt: 3120.0,
  },
  {
    id: 'merch-03',
    name: 'Lagos OPay & PalmPay Desk',
    code: 'MERCH-NG-01',
    status: 'Active',
    supportedCountries: ['Nigeria'],
    supportedPaymentMethods: ['OPay', 'PalmPay', 'Bank Transfer'],
    operatingHours: '06:00 - 00:00 WAT',
    liquidityLimitUsdt: 100000,
    currentWorkload: 12,
    completionRate: 97.8,
    avgResponseTimeSec: 24,
    totalSettledVolumeUsdt: 450000,
    totalEarningsUsdt: 4500.0,
  },
];

export const useMerchantStore = create<MerchantState>((set) => ({
  merchants: INITIAL_MERCHANTS,
  routingPolicy: 'HIGHEST_COMPLETION',

  setRoutingPolicy: (routingPolicy) => set({ routingPolicy }),

  updateMerchantStatus: (id, status) =>
    set((state) => ({
      merchants: state.merchants.map((m) => (m.id === id ? { ...m, status } : m)),
    })),

  registerMerchant: (merchantData) => {
    const newMerch: MerchantProfile = {
      ...merchantData,
      id: `merch-${Date.now()}`,
      totalSettledVolumeUsdt: 0,
      totalEarningsUsdt: 0,
    };
    set((state) => ({ merchants: [...state.merchants, newMerch] }));
  },
}));
