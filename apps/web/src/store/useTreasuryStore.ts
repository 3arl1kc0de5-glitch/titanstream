import { create } from 'zustand';
import { useAuthStore } from './useAuthStore';

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

  // Actions
  takeSnapshot: () => void;
  incrementMissionProgress: (type: MissionItem['type'], amount?: number) => void;
  claimMissionReward: (id: string) => void;
  calculateGrowthShare: () => void;
  startNewDay: () => void;
  resetSeason: () => void;
  simulateOperatorTrade: (operatorName: string, amount: number) => void;
  tickEconomyValues: () => void;
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
    progress: 6,
    target: 7,
    status: 'IN_PROGRESS',
    actionLabel: 'Active Streak',
  },
];

const INITIAL_EVENTS: CommunityEvent[] = [
  {
    id: 'e1',
    title: 'Weekend Operator Bonus',
    description: 'Get +20% power on all verified P2P operator orders.',
    status: 'ACTIVE',
    badge: 'Active Now',
  },
  {
    id: 'e2',
    title: 'Referral Week Madness',
    description: 'Double treasury power payouts for all verified invites.',
    status: 'ACTIVE',
    badge: 'X2 Power',
  },
  {
    id: 'e3',
    title: 'Treasury Race League',
    description: 'Compete for the top growth percentage slot in Season 2.',
    status: 'UPCOMING',
    badge: 'In 3 Days',
  },
];

export const useTreasuryStore = create<TreasuryState>((set, get) => ({
  cycleStatus: 'NEW_DAY',
  dailyBoostActive: false,
  powerEarnedToday: 0,

  // Permanent Reputation
  reputationPower: 2400,
  trustScore: 98,
  reputationRank: 'Builder',
  operatorAccess: 'Unlocked',

  // Live Economy initial values
  treasuryToday: 84000.0,
  depositsToday: 84000.0,
  withdrawalsToday: 53000.0,
  operatorVolume: 410000.0,
  topGrowth: 12.4,

  // Season
  seasonNumber: 1,
  seasonTitle: 'Treasury Expansion',
  daysRemaining: 30,
  seasonTargetPower: 10000,
  seasonProgressPower: 2400,

  missions: INITIAL_MISSIONS,
  events: INITIAL_EVENTS,

  takeSnapshot: () => {
    if (get().cycleStatus !== 'NEW_DAY') return;
    set({ cycleStatus: 'SNAPSHOT_TAKEN' });
    // Advance to active opportunities shortly
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

    // Grant reward power
    const reward = mission.rewardPower;
    const newReputationPower = state.reputationPower + reward;
    const newSeasonPower = Math.min(state.seasonTargetPower, state.seasonProgressPower + reward);

    // Apply special mission benefits
    let boostActive = state.dailyBoostActive;
    let trust = state.trustScore;

    if (mission.type === 'DEPOSIT') {
      boostActive = true;
    }
    if (mission.type === 'OPERATIONS') {
      trust = Math.min(100, trust + 1);
    }

    // Recalculate Rank
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
    // Reset missions and update snapshot values, keeping reputation intact
    const randomMultiplier = 0.98 + Math.random() * 0.04; // small fluctuation
    set((state) => {
      const isAuthenticated = useAuthStore.getState().isAuthenticated;
      let newTreasury = state.treasuryToday * randomMultiplier;
      if (!isAuthenticated && newTreasury > 99500) {
        newTreasury = 99500 + (Math.random() * 100 - 50);
      }

      return {
        cycleStatus: 'NEW_DAY',
        dailyBoostActive: false,
        powerEarnedToday: 0,
        treasuryToday: newTreasury,
        depositsToday: state.depositsToday * randomMultiplier,
        withdrawalsToday: state.withdrawalsToday * randomMultiplier,
        operatorVolume: state.operatorVolume * randomMultiplier,
        topGrowth: parseFloat((10 + Math.random() * 5).toFixed(1)),
        daysRemaining: Math.max(1, state.daysRemaining - 1),
        missions: INITIAL_MISSIONS.map((m) => {
          // preserve 7-day streak progress but increment it if completed yesterday
          if (m.type === 'STAY_ACTIVE') {
            const oldStreak = state.missions.find((old) => old.type === 'STAY_ACTIVE');
            const oldProgress = oldStreak ? oldStreak.progress : 6;
            const wasClaimed = oldStreak?.status === 'CLAIMED';
            const newProg = wasClaimed ? 1 : Math.min(7, oldProgress + 1);
            return {
              ...m,
              progress: newProg,
              status: newProg >= 7 ? 'CLAIMABLE' : 'IN_PROGRESS',
            };
          }
          return m;
        }),
      };
    });
  },

  resetSeason: () => {
    // Reset season target and numbers, keep trustScore & reputationPower
    set((state) => ({
      seasonNumber: state.seasonNumber + 1,
      seasonTitle: state.seasonNumber === 1 ? 'Treasury Expansion II' : `Liquidity Frontier ${state.seasonNumber + 1}`,
      daysRemaining: 30,
      seasonProgressPower: 0,
      seasonTargetPower: state.seasonTargetPower + 2000,
    }));
  },

  simulateOperatorTrade: (_operatorName, amount) => {
    // Complete the Operator Daily Mission
    get().incrementMissionProgress('OPERATIONS', 1);
    // Increase Operator Volume
    set((state) => ({
      operatorVolume: state.operatorVolume + amount,
    }));
  },

  tickEconomyValues: () => {
    set((state) => {
      const isAuthenticated = useAuthStore.getState().isAuthenticated;
      const growthMultiplier = isAuthenticated ? 2.5 : 1.0;

      // Simulate slow realistic live ticking
      const depositTick = Math.random() * 0.45 * growthMultiplier;
      const withdrawTick = Math.random() * 0.25;
      const volumeTick = Math.random() * 1.20 * growthMultiplier;
      
      const newDeposits = state.depositsToday + depositTick;
      const newWithdrawals = state.withdrawalsToday + withdrawTick;
      let newTreasury = state.treasuryToday + (depositTick - withdrawTick);

      // Capped below 100k if not authenticated
      if (!isAuthenticated && newTreasury > 99500) {
        newTreasury = 99500 + (Math.random() * 100 - 50); // hover around 99.5k
      }

      return {
        depositsToday: newDeposits,
        withdrawalsToday: newWithdrawals,
        treasuryToday: newTreasury,
        operatorVolume: state.operatorVolume + volumeTick,
      };
    });
  },

  adjustTreasuryStats: (type, amount) => {
    set((state) => {
      const isAuthenticated = useAuthStore.getState().isAuthenticated;
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
      } else { // BOOST
        newDeposits += amount;
        newTreasury += amount;
        newVolume += amount;
      }

      if (!isAuthenticated && newTreasury > 99500) {
        newTreasury = 99500 + (Math.random() * 100 - 50);
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
