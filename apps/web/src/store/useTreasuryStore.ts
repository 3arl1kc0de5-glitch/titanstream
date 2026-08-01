import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';
import { treasuryService } from '../services/treasuryService';

export type CycleStatus =
  | 'NEW_DAY'
  | 'SNAPSHOT_TAKEN'
  | 'OPPORTUNITIES_ACTIVE'
  | 'GROWTH_CALCULATED'
  | 'TOMORROW_UNLOCKED';

export interface MissionItem {
  id: string;
  type: 'DEPOSIT' | 'REFER' | 'WITHDRAW' | 'OPERATIONS' | 'STAY_ACTIVE';
  title: string;
  subtitle: string;
  rewardPower: number;
  progress: number;
  target: number;
  status: 'IN_PROGRESS' | 'CLAIMABLE' | 'CLAIMED';
  actionLabel: string;
}

export interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  status: 'ACTIVE' | 'UPCOMING';
  badge?: string;
}

interface TreasuryState {
  // Daily Cycle
  cycleStatus: CycleStatus;
  dailyBoostActive: boolean;
  powerEarnedToday: number;

  // Reputation & Profile
  reputationPower: number;
  trustScore: number;
  reputationRank: 'Builder' | 'Guardian' | 'Architect' | 'Grandmaster';
  operatorAccess: 'Unlocked' | 'Locked';

  // Live Economy Stats
  treasuryToday: number;
  depositsToday: number;
  withdrawalsToday: number;
  operatorVolume: number;
  topGrowth: number;

  // Active Season
  seasonNumber: number;
  seasonTitle: string;
  daysRemaining: number;
  seasonTargetPower: number;
  seasonProgressPower: number;

  // Missions & Events
  missions: MissionItem[];
  events: CommunityEvent[];
  isLoading: boolean;

  // Actions
  fetchTreasuryState: () => Promise<void>;
  takeSnapshot: () => void;
  incrementMissionProgress: (type: MissionItem['type'], amount?: number) => void;
  claimMissionReward: (id: string) => void;
  calculateGrowthShare: () => void;
  startNewDay: () => void;
  resetSeason: () => void;
  simulateOperatorTrade: (operatorName: string, amount: number) => void;
  adjustTreasuryStats: (type: 'DEPOSIT' | 'WITHDRAW' | 'BOOST', amount: number) => void;
  adjustTrustScore: (delta: number) => void;
}

const INITIAL_MISSIONS: MissionItem[] = [
  {
    id: 'm_dep',
    type: 'DEPOSIT',
    title: 'Deposit USDT today',
    subtitle: 'Earn a temporary 1.5× compute yield boost',
    rewardPower: 200,
    progress: 0,
    target: 1,
    status: 'IN_PROGRESS',
    actionLabel: 'Deposit',
  },
  {
    id: 'm_ref',
    type: 'REFER',
    title: 'Refer one verified user',
    subtitle: 'Bring a friend into the daily cycle',
    rewardPower: 150,
    progress: 0,
    target: 1,
    status: 'IN_PROGRESS',
    actionLabel: 'Invite',
  },
  {
    id: 'm_wth',
    type: 'WITHDRAW',
    title: 'Complete your first withdrawal',
    subtitle: 'Verify cash-out speed and utility',
    rewardPower: 100,
    progress: 0,
    target: 1,
    status: 'IN_PROGRESS',
    actionLabel: 'Withdraw',
  },
  {
    id: 'm_merch',
    type: 'OPERATIONS',
    title: 'Buy USDT from a new operator',
    subtitle: 'Support community liquidity & volume',
    rewardPower: 250,
    progress: 0,
    target: 1,
    status: 'IN_PROGRESS',
    actionLabel: 'Trade P2P',
  },
  {
    id: 'm_streak',
    type: 'STAY_ACTIVE',
    title: 'Stay active 7 consecutive days',
    subtitle: 'Build long-term treasury reputation',
    rewardPower: 500,
    progress: 0,
    target: 7,
    status: 'IN_PROGRESS',
    actionLabel: 'Active Streak',
  },
];

const INITIAL_EVENTS: CommunityEvent[] = [
  {
    id: 'e1',
    title: 'P2P Operator Processing',
    description: 'Verified P2P operator orders active on settlement rails.',
    status: 'ACTIVE',
    badge: 'Live',
  },
  {
    id: 'e2',
    title: 'Treasury Liquidity League',
    description: 'Real-time liquidity verification and double-entry ledger audits active.',
    status: 'ACTIVE',
    badge: 'Verified',
  },
];

export const useTreasuryStore = create<TreasuryState>((set, get) => ({
  cycleStatus: 'NEW_DAY',
  dailyBoostActive: false,
  powerEarnedToday: 0,

  // Production initial values - Sourced live from Treasury & Balance Engine
  reputationPower: 0,
  trustScore: 20,
  reputationRank: 'Builder',
  operatorAccess: 'Locked',

  // Live Economy stats
  treasuryToday: 0.0,
  depositsToday: 0.0,
  withdrawalsToday: 0.0,
  operatorVolume: 0.0,
  topGrowth: 0.0,

  // Season
  seasonNumber: 1,
  seasonTitle: 'Treasury Expansion',
  daysRemaining: 30,
  seasonTargetPower: 10000,
  seasonProgressPower: 0,

  missions: INITIAL_MISSIONS,
  events: INITIAL_EVENTS,
  isLoading: false,

  fetchTreasuryState: async () => {
    set({ isLoading: true });
    try {
      const [metrics, trustProfile] = await Promise.all([
        treasuryService.getMetrics(),
        treasuryService.getUserTrustProfile(),
      ]);

      set({
        treasuryToday: metrics.totalLiquidity,
        depositsToday: metrics.settlementExposure,
        withdrawalsToday: metrics.projectedPayouts,
        trustScore: trustProfile.trustScore,
        reputationRank: trustProfile.reputationRank,
        operatorAccess: trustProfile.operatorAccess,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  takeSnapshot: () => {
    if (get().cycleStatus !== 'NEW_DAY') return;
    set({ cycleStatus: 'SNAPSHOT_TAKEN' });
    setTimeout(() => {
      set({ cycleStatus: 'OPPORTUNITIES_ACTIVE' });
    }, 1200);
  },

  incrementMissionProgress: (type, amount = 1) => {
    set((state) => {
      const updatedMissions = state.missions.map((m) => {
        if (m.type !== type || m.status !== 'IN_PROGRESS') return m;
        const newProgress = Math.min(m.target, m.progress + amount);
        const newStatus = newProgress >= m.target ? 'CLAIMABLE' : 'IN_PROGRESS';
        return { ...m, progress: newProgress, status: newStatus as any };
      });
      return { missions: updatedMissions };
    });
  },

  claimMissionReward: (id) => {
    const state = get();
    const mission = state.missions.find((m) => m.id === id);
    if (!mission || mission.status !== 'CLAIMABLE') return;

    const reward = mission.rewardPower;
    const newReputationPower = state.reputationPower + reward;
    const newSeasonPower = Math.min(state.seasonTargetPower, state.seasonProgressPower + reward);

    let boostActive = state.dailyBoostActive;
    let trust = state.trustScore;

    if (mission.type === 'DEPOSIT') {
      boostActive = true;
    }
    if (mission.type === 'OPERATIONS') {
      trust = Math.min(100, trust + 1);
    }

    let rank = state.reputationRank;
    if (newReputationPower >= 5000) rank = 'Grandmaster';
    else if (newReputationPower >= 4000) rank = 'Architect';
    else if (newReputationPower >= 3000) rank = 'Guardian';

    set((s) => ({
      reputationPower: newReputationPower,
      seasonProgressPower: newSeasonPower,
      dailyBoostActive: boostActive,
      trustScore: trust,
      reputationRank: rank,
      powerEarnedToday: s.powerEarnedToday + reward,
      missions: s.missions.map((m) => (m.id === id ? { ...m, status: 'CLAIMED' } : m)),
    }));
  },

  calculateGrowthShare: () => {
    if (get().cycleStatus !== 'OPPORTUNITIES_ACTIVE') return;
    set({ cycleStatus: 'GROWTH_CALCULATED' });
    setTimeout(() => {
      set({ cycleStatus: 'TOMORROW_UNLOCKED' });
    }, 1500);
  },

  startNewDay: () => {
    set((state) => ({
      cycleStatus: 'NEW_DAY',
      dailyBoostActive: false,
      powerEarnedToday: 0,
      daysRemaining: Math.max(1, state.daysRemaining - 1),
    }));
  },

  resetSeason: () => {
    set((state) => ({
      seasonNumber: state.seasonNumber + 1,
      seasonTitle: `Liquidity Frontier ${state.seasonNumber + 1}`,
      daysRemaining: 30,
      seasonProgressPower: 0,
      seasonTargetPower: state.seasonTargetPower + 2000,
    }));
  },

  simulateOperatorTrade: (_operatorName, amount) => {
    get().incrementMissionProgress('OPERATIONS', 1);
    set((state) => ({
      operatorVolume: state.operatorVolume + amount,
    }));
  },

  adjustTreasuryStats: (type, amount) => {
    set((state) => {
      let newTreasury = state.treasuryToday;
      let newDeposits = state.depositsToday;
      let newWithdrawals = state.withdrawalsToday;
      let newVolume = state.operatorVolume;

      if (type === 'DEPOSIT') {
        newDeposits += amount;
        newTreasury += amount;
      } else if (type === 'WITHDRAW') {
        newWithdrawals += amount;
        newTreasury = Math.max(0, newTreasury - amount);
      } else {
        newDeposits += amount;
        newTreasury += amount;
        newVolume += amount;
      }

      return {
        depositsToday: newDeposits,
        withdrawalsToday: newWithdrawals,
        treasuryToday: newTreasury,
        operatorVolume: newVolume,
      };
    });
  },

  adjustTrustScore: (delta) => {
    set((state) => ({
      trustScore: Math.min(100, Math.max(0, state.trustScore + delta)),
    }));
  },
}));
