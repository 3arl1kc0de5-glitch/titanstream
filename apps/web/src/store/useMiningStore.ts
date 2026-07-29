import { create } from 'zustand';
import { miningService } from '../services/mining.service';
import { useWalletStore } from './useWalletStore';

type Currency = 'USDT' | 'TON';

export interface MiningState {
  activeCurrency: Currency;
  baseSpeedGhs: number;
  coolerMultiplier: number;
  maxMultiplier: number;
  isActive: boolean;
  isOverheated: boolean;
  cooldownTimer: number;
  tapsToday: number;
  tapsThisWeek: number;
  tapsThisMonth: number;
  dailyTapLimit: number;
  weeklyTapLimit: number;
  monthlyTapLimit: number;
  tonUnlocked: boolean;
  tonPrice: number;
  usdtSpinnerIdx: number;
  tonSpinnerIdx: number;
  unclaimedBalance: number;
  hasPurchasedMachine: boolean;
  trialStartedAt: number;
  
  toggleCurrency: (currency: Currency) => Promise<void>;
  setUsdtSpinnerIdx: (idx: number) => void;
  setTonSpinnerIdx: (idx: number) => void;
  tap: () => boolean; // returns false if overheated/locked
  setMultiplier: (value: number) => void;
  decay: () => void;
  triggerOverheat: () => void;
  tickCooldown: () => void;
  resetOverheat: () => void;
  upgradeBaseSpeed: (amount: number) => void;
  markMachinePurchased: () => void;
  upgradeLimits: () => void;
  resetTaps: (period: 'daily' | 'weekly' | 'monthly') => void;
  unlockTON: () => void;
  isTrialActive: () => boolean;
  isTrialExpired: () => boolean;
  getTrialRemainingMs: () => number;
  isMiningLocked: () => boolean;
  fetchMiningState: () => Promise<void>;
  claimMinedYield: () => Promise<boolean>;
}

const MIN_BOOST_USDT = [0, 5.0, 12.0, 25.0];
const MIN_BOOST_TON = [0, 5.0, 12.0, 25.0];

const getStoredTrialStartedAt = (): number => {
  const stored = localStorage.getItem('trial_started_at');
  if (stored) return parseInt(stored, 10);
  const now = Date.now();
  localStorage.setItem('trial_started_at', now.toString());
  return now;
};

const DURATION_24H_MS = 24 * 60 * 60 * 1000;

export const useMiningStore = create<MiningState>((set, get) => {
  const initialPurchased = localStorage.getItem('has_purchased_machine') === 'true';
  const initialTrialStartedAt = getStoredTrialStartedAt();
  const initialBaseSpeed = initialPurchased ? 5.0 : 1.0;

  return {
    activeCurrency: 'USDT',
    baseSpeedGhs: initialBaseSpeed,
    coolerMultiplier: 1.0,
    maxMultiplier: 20.2,
    isActive: true,
    isOverheated: false,
    cooldownTimer: 0,
    tapsToday: 0,
    tapsThisWeek: 0,
    tapsThisMonth: 0,
    dailyTapLimit: 200,
    weeklyTapLimit: 1000,
    monthlyTapLimit: 4000,
    tonUnlocked: localStorage.getItem('ton_unlocked') === 'true',
    tonPrice: 110.00,
    usdtSpinnerIdx: 0,
    tonSpinnerIdx: 0,
    unclaimedBalance: 0.0,
    hasPurchasedMachine: initialPurchased,
    trialStartedAt: initialTrialStartedAt,

    fetchMiningState: async () => {
      try {
        const res = await miningService.getMiningState();
        if (res.success && res.data) {
          set({
            activeCurrency: res.data.activeCurrency,
            baseSpeedGhs: res.data.baseSpeedGhs || (get().hasPurchasedMachine ? 5.0 : 1.0),
            coolerMultiplier: res.data.coolerMultiplier,
            unclaimedBalance: res.data.unclaimedBalance,
          });
        }
      } catch (err) {
        console.warn('Failed to fetch backend mining state:', err);
      }
    },

    claimMinedYield: async () => {
      try {
        const res = await miningService.claimRewards();
        if (res.success && res.data?.success) {
          await useWalletStore.getState().fetchBalanceFromEngine();
          set({
            unclaimedBalance: 0.0,
            coolerMultiplier: 1.0,
          });
          return true;
        }
        return false;
      } catch (err) {
        console.error('Failed to claim mining yield:', err);
        return false;
      }
    },

    toggleCurrency: async (currency) => {
      set({ activeCurrency: currency });
      try {
        await miningService.toggleCurrency(currency);
      } catch (err) {
        console.warn('Failed to sync currency toggle to backend:', err);
      }
    },

    setUsdtSpinnerIdx: (idx) => set({ usdtSpinnerIdx: idx }),
    setTonSpinnerIdx: (idx) => set({ tonSpinnerIdx: idx }),
    
    tap: () => {
      const state = get();
      if (state.isOverheated || state.isMiningLocked()) {
        return false;
      }
      const nextMultiplier = Math.min(state.coolerMultiplier + 0.6, state.maxMultiplier);
      const willOverheat = nextMultiplier >= state.maxMultiplier;

      set({
        coolerMultiplier: nextMultiplier,
        isOverheated: willOverheat,
        cooldownTimer: willOverheat ? 15 : state.cooldownTimer,
        tapsToday: state.tapsToday + 1,
        tapsThisWeek: state.tapsThisWeek + 1,
        tapsThisMonth: state.tapsThisMonth + 1,
        unclaimedBalance: state.unclaimedBalance + 0.02,
      });

      miningService.tapCooler().catch((err) => {
        console.warn('Failed to sync tap to backend:', err);
      });

      return !willOverheat;
    },

    setMultiplier: (value) => set({ coolerMultiplier: value }),
    decay: () =>
      set((state) => {
        if (state.isOverheated) return state;
        return {
          coolerMultiplier: Math.max(1.0, state.coolerMultiplier - 0.05),
        };
      }),
    triggerOverheat: () => set({ isOverheated: true, cooldownTimer: 15, coolerMultiplier: 20.2 }),
    tickCooldown: () =>
      set((state) => {
        if (!state.isOverheated) return state;
        const nextTimer = state.cooldownTimer - 1;
        if (nextTimer <= 0) {
          return { isOverheated: false, cooldownTimer: 0, coolerMultiplier: 1.0 };
        }
        return {
          cooldownTimer: nextTimer,
          coolerMultiplier: Math.max(1.0, state.coolerMultiplier - (state.maxMultiplier / 15)),
        };
      }),
    resetOverheat: () => set({ isOverheated: false, cooldownTimer: 0, coolerMultiplier: 1.0 }),
    upgradeBaseSpeed: (amount) => {
      localStorage.setItem('has_purchased_machine', 'true');
      set((state) => ({
        hasPurchasedMachine: true,
        baseSpeedGhs: state.hasPurchasedMachine ? state.baseSpeedGhs + amount : amount,
      }));
    },
    markMachinePurchased: () => {
      localStorage.setItem('has_purchased_machine', 'true');
      set({ hasPurchasedMachine: true });
    },
    upgradeLimits: () =>
      set((state) => ({
        dailyTapLimit: state.dailyTapLimit + 200,
        weeklyTapLimit: state.weeklyTapLimit + 1000,
        monthlyTapLimit: state.monthlyTapLimit + 4000,
        tapsToday: 0,
        tapsThisWeek: 0,
        tapsThisMonth: 0,
      })),
    resetTaps: (period) =>
      set((state) => ({
        tapsToday: period === 'daily' ? 0 : state.tapsToday,
        tapsThisWeek: period === 'weekly' ? 0 : state.tapsThisWeek,
        tapsThisMonth: period === 'monthly' ? 0 : state.tapsThisMonth,
      })),
    unlockTON: () => {
      localStorage.setItem('ton_unlocked', 'true');
      set({ tonUnlocked: true });
    },
    isTrialActive: () => {
      const s = get();
      if (s.hasPurchasedMachine) return false;
      const elapsed = Date.now() - s.trialStartedAt;
      return elapsed < DURATION_24H_MS;
    },
    isTrialExpired: () => {
      const s = get();
      if (s.hasPurchasedMachine) return false;
      const elapsed = Date.now() - s.trialStartedAt;
      return elapsed >= DURATION_24H_MS;
    },
    getTrialRemainingMs: () => {
      const s = get();
      if (s.hasPurchasedMachine) return 0;
      const expiresAt = s.trialStartedAt + DURATION_24H_MS;
      return Math.max(0, expiresAt - Date.now());
    },
    isMiningLocked: () => {
      const s = get();
      // If user hasn't purchased a machine and trial is expired -> locked!
      if (!s.hasPurchasedMachine && s.isTrialExpired()) {
        return true;
      }
      if (s.activeCurrency === 'TON' && !s.tonUnlocked) {
        return true;
      }
      const reqSpeed = s.activeCurrency === 'USDT' 
        ? MIN_BOOST_USDT[s.usdtSpinnerIdx] || 0
        : MIN_BOOST_TON[s.tonSpinnerIdx] || 0;
      return s.baseSpeedGhs < reqSpeed;
    },
  };
});
