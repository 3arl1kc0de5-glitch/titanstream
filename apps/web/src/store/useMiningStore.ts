import { create } from 'zustand';
import { miningService, type MiningStateResponse } from '../services/mining.service';
import { useWalletStore } from './useWalletStore';
import { MACHINE_CATALOG } from '../data/machines';

type Currency = 'USDT' | 'TON';

export interface MiningState {
  // ── Authoritative engine state (backend session + optimistic taps) ──
  activeCurrency: Currency;
  baseSpeedGhs: number;
  coolerMultiplier: number;
  maxMultiplier: number;
  unclaimedBalance: number;
  machineMode: string;
  lifetimePromotionalOutput: number;
  interactivePromotionalOutput: number;
  isOverheated: boolean;
  cooldownRemaining: number;
  tapYieldPerTap: number;

  // ── Eased display values (rendering only — never used for claims) ──
  displayUnclaimed: number;
  displayMultiplier: number;
  displayPromoOutput: number;

  // ── Client-only gameplay state ──
  isActive: boolean;
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
  hasPurchasedMachine: boolean;

  // ── Actions ──
  toggleCurrency: (currency: Currency) => Promise<void>;
  setUsdtSpinnerIdx: (idx: number) => void;
  setTonSpinnerIdx: (idx: number) => void;
  tap: () => number; // returns per-tap yield for particle feedback (-1 if tap failed)
  applyServerSession: (session: MiningStateResponse, opts?: { snapDisplay?: boolean }) => void;
  fetchMiningState: () => Promise<void>;
  claimMinedYield: () => Promise<boolean>;
  startDisplayTicker: () => void;
  stopDisplayTicker: () => void;
  upgradeBaseSpeed: (amount: number) => void;
  markMachinePurchased: () => void;
  upgradeLimits: () => void;
  resetTaps: (period: 'daily' | 'weekly' | 'monthly') => void;
  unlockTON: () => void;
  isMiningLocked: () => boolean;
}

const MIN_BOOST_USDT = [0, 5.0, 25.0, 130.0, 550.0, 1500.0];
const MIN_BOOST_TON = [0, 5.0, 25.0, 130.0, 550.0, 1500.0];

const TICK_MS = 100;
const EASE_UP = 0.3; // fast catch-up toward higher targets (taps)
const EASE_DOWN = 0.06; // slow settle toward lower targets (cooling / claim)
const EASE_FLAT = 0.15;
const DECAY_PER_TICK = 0.05; // mirrors backend multiplier decay (0.5x / second)

let displayTicker: ReturnType<typeof setInterval> | null = null;
let hydrated = false;

export const useMiningStore = create<MiningState>((set, get) => {
  const initialPurchased = localStorage.getItem('has_purchased_machine') === 'true';
  const initialBaseSpeed = initialPurchased ? 5.0 : 1.0;

  return {
    activeCurrency: 'USDT',
    baseSpeedGhs: initialBaseSpeed,
    coolerMultiplier: 1.0,
    maxMultiplier: 20.2,
    unclaimedBalance: 0.0,
    machineMode: 'PROMOTIONAL',
    lifetimePromotionalOutput: 0.0,
    interactivePromotionalOutput: 0.0,
    isOverheated: false,
    cooldownRemaining: 0,
    tapYieldPerTap: 0,

    displayUnclaimed: 0.0,
    displayMultiplier: 1.0,
    displayPromoOutput: 0.0,

    isActive: true,
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
    hasPurchasedMachine: initialPurchased,

    /**
     * The single entry point for backend state. Every visual element renders
     * from these fields. Between server responses the display ticker eases
     * toward them so the UI never freezes or jumps. Display values snap on the
     * first fetch (session restore) and after claims (wallet already updated).
     */
    applyServerSession: (session, opts) => {
      const snap = opts?.snapDisplay ?? !hydrated;
      hydrated = true;
      set({
        activeCurrency: session.activeCurrency,
        baseSpeedGhs: session.baseSpeedGhs,
        coolerMultiplier: session.coolerMultiplier,
        unclaimedBalance: session.unclaimedBalance,
        machineMode: session.machineMode,
        lifetimePromotionalOutput: session.lifetimePromotionalOutput,
        interactivePromotionalOutput: session.interactivePromotionalOutput,
        isOverheated: session.isOverheated,
        cooldownRemaining: session.cooldownRemaining,
        tapYieldPerTap: session.tapYieldPerTap,
        displayUnclaimed: snap ? session.unclaimedBalance : get().displayUnclaimed,
        displayMultiplier: snap ? session.coolerMultiplier : get().displayMultiplier,
        displayPromoOutput: snap ? session.lifetimePromotionalOutput : get().displayPromoOutput,
      });
    },

    fetchMiningState: async () => {
      try {
        const res = await miningService.getMiningState();
        if (res.success && res.data) {
          get().applyServerSession(res.data);
        }
      } catch (err) {
        console.warn('Failed to fetch backend mining state:', err);
      }
    },

    claimMinedYield: async () => {
      try {
        const res = await miningService.claimRewards();
        if (res && res.success && res.data?.success) {
          await useWalletStore.getState().fetchBalanceFromEngine();
          if (res.data.session) {
            get().applyServerSession(res.data.session, { snapDisplay: true });
          }
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
        const res = await miningService.toggleCurrency(currency);
        if (res.success && res.data) {
          get().applyServerSession(res.data);
        }
      } catch (err) {
        console.warn('Failed to sync currency toggle to backend:', err);
      }
    },

    setUsdtSpinnerIdx: (idx) => set({ usdtSpinnerIdx: idx }),
    setTonSpinnerIdx: (idx) => set({ tonSpinnerIdx: idx }),

    /**
     * Tap flow: optimistic multiplier bump for instant progress feedback, then
     * the backend computes and credits the yield. The server response is the
     * authoritative state — no yield is calculated or stored client-side.
     * Returns the per-tap yield estimate for particle feedback, or -1 on failure.
     */
    tap: () => {
      const state = get();
      if (state.isOverheated || state.isMiningLocked()) {
        return -1;
      }
      if (state.tapsToday >= state.dailyTapLimit || state.tapsThisWeek >= state.weeklyTapLimit || state.tapsThisMonth >= state.monthlyTapLimit) {
        return -1;
      }

      const nextMultiplier = Math.min(state.coolerMultiplier + 0.6, state.maxMultiplier);
      const willOverheat = nextMultiplier >= state.maxMultiplier;

      set({
        coolerMultiplier: nextMultiplier,
        isOverheated: willOverheat,
        cooldownRemaining: willOverheat ? 15 : state.cooldownRemaining,
        tapsToday: state.tapsToday + 1,
        tapsThisWeek: state.tapsThisWeek + 1,
        tapsThisMonth: state.tapsThisMonth + 1,
      });

      miningService.tapCooler().then((res) => {
        if (res.success && res.data) {
          get().applyServerSession(res.data);
        }
      }).catch((err) => {
        console.warn('Failed to sync tap to backend:', err);
      });

      return state.tapYieldPerTap;
    },

    upgradeBaseSpeed: (amount) =>
      set((state) => ({ baseSpeedGhs: state.baseSpeedGhs + amount })),
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
    isMiningLocked: () => {
      const s = get();
      const isUsdt = s.activeCurrency === 'USDT';
      const spinnerIdx = isUsdt ? s.usdtSpinnerIdx : s.tonSpinnerIdx;

      if (s.activeCurrency === 'TON' && !s.tonUnlocked) {
        return true;
      }
      const reqSpeed = isUsdt
        ? MIN_BOOST_USDT[spinnerIdx] || 0
        : MIN_BOOST_TON[spinnerIdx] || 0;
      return s.baseSpeedGhs < reqSpeed;
    },

    startDisplayTicker: () => {
      if (displayTicker) return;
      displayTicker = setInterval(() => {
        const s = get();

        // Ease the odometer-style displays toward authoritative targets
        const unclDir = s.unclaimedBalance >= s.displayUnclaimed ? EASE_FLAT : EASE_DOWN;
        const promoDir = s.lifetimePromotionalOutput >= s.displayPromoOutput ? EASE_FLAT : EASE_DOWN;
        set({
          displayUnclaimed: s.displayUnclaimed + (s.unclaimedBalance - s.displayUnclaimed) * unclDir,
          displayPromoOutput: s.displayPromoOutput + (s.lifetimePromotionalOutput - s.displayPromoOutput) * promoDir,
        });

        // Cooldown countdown rendering (recalibrated by every server response).
        // When the cooling window closes, the core resets — mirroring the engine.
        let nextCooldown = s.cooldownRemaining;
        let nextOverheated = s.isOverheated;
        let nextMultiplier = s.coolerMultiplier;
        if (s.isOverheated && nextCooldown > 0) {
          nextCooldown = Math.max(0, nextCooldown - TICK_MS / 1000);
          if (nextCooldown <= 0) {
            nextOverheated = false;
            nextMultiplier = 1.0;
          }
        }

        // Mirrors backend decay so cooling looks smooth between syncs
        if (!nextOverheated && nextMultiplier > 1.0) {
          nextMultiplier = Math.max(1.0, nextMultiplier - DECAY_PER_TICK);
        }
        const multDir = nextMultiplier >= s.displayMultiplier ? EASE_UP : EASE_DOWN;
        set({
          displayMultiplier: s.displayMultiplier + (nextMultiplier - s.displayMultiplier) * multDir,
          cooldownRemaining: nextCooldown,
          isOverheated: nextOverheated,
          coolerMultiplier: nextMultiplier,
        });
      }, TICK_MS);
    },

    stopDisplayTicker: () => {
      if (displayTicker) {
        clearInterval(displayTicker);
        displayTicker = null;
      }
    },
  };
});
