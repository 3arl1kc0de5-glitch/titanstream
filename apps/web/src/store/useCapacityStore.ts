import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Domain Types
export type CapacitySource = 
  | 'DAILY_LOGIN'
  | 'DEPOSIT'
  | 'REFERRAL_SIGNUP'
  | 'REFERRAL_DEPOSIT'
  | 'CONSECUTIVE_DAYS'
  | 'PREMIUM_PURCHASE'
  | 'CAPACITY_BOOST'
  | 'CAPACITY_PACK'
  | 'REFERRAL_ACCELERATOR'
  | 'MEMBERSHIP_UPGRADE'
  | 'SEASON_PASS'
  | 'ADMIN_BONUS'
  | 'CAMPAIGN_COMPLETION'
  | 'KYC_MILESTONE'
  | 'PROFILE_COMPLETION'
  | 'SECURITY_VERIFICATION';

export type CapacityLevel = 
  | 'SEED'
  | 'BUILDER'
  | 'OPERATOR'
  | 'PARTNER'
  | 'ELITE'
  | 'TITAN'
  | 'INSTITUTIONAL';

export type DailyCycleStatus = 
  | 'NOT_ACTIVATED'
  | 'ACTIVATED'
  | 'CAPACITY_EARNED'
  | 'SETTLEMENT_CLAIMED';

export interface CapacityTransaction {
  id: string;
  source: CapacitySource;
  amount: number;
  timestamp: number;
  description: string;
  isPaid: boolean;
}

export interface CapacityOpportunity {
  id: string;
  source: CapacitySource;
  title: string;
  description: string;
  reward: number;
  isPaid: boolean;
  price?: number;
  isAvailable: boolean;
  progress?: number;
  target?: number;
  icon: string;
}

export interface CapacityLevelConfig {
  level: CapacityLevel;
  name: string;
  threshold: number;
  earningMultiplier: number;
  referralMultiplier: number;
  withdrawalLimit: number;
  benefits: string[];
}

// Default capacity level configurations (configurable from admin)
const DEFAULT_CAPACITY_LEVELS: CapacityLevelConfig[] = [
  {
    level: 'SEED',
    name: 'Seed',
    threshold: 0,
    earningMultiplier: 1.0,
    referralMultiplier: 1.0,
    withdrawalLimit: 100,
    benefits: ['Basic earning rate', 'Standard withdrawal limits']
  },
  {
    level: 'BUILDER',
    name: 'Builder',
    threshold: 500,
    earningMultiplier: 1.2,
    referralMultiplier: 1.1,
    withdrawalLimit: 250,
    benefits: ['1.2x earning rate', '1.1x referral rewards', 'Higher withdrawal limits']
  },
  {
    level: 'OPERATOR',
    name: 'Operator',
    threshold: 1500,
    earningMultiplier: 1.5,
    referralMultiplier: 1.25,
    withdrawalLimit: 500,
    benefits: ['1.5x earning rate', '1.25x referral rewards', 'Priority support']
  },
  {
    level: 'PARTNER',
    name: 'Partner',
    threshold: 3500,
    earningMultiplier: 2.0,
    referralMultiplier: 1.5,
    withdrawalLimit: 1000,
    benefits: ['2x earning rate', '1.5x referral rewards', 'Exclusive campaigns']
  },
  {
    level: 'ELITE',
    name: 'Elite',
    threshold: 7500,
    earningMultiplier: 2.5,
    referralMultiplier: 1.75,
    withdrawalLimit: 2500,
    benefits: ['2.5x earning rate', '1.75x referral rewards', 'Premium investments']
  },
  {
    level: 'TITAN',
    name: 'Titan',
    threshold: 15000,
    earningMultiplier: 3.0,
    referralMultiplier: 2.0,
    withdrawalLimit: 5000,
    benefits: ['3x earning rate', '2x referral rewards', 'VIP events']
  },
  {
    level: 'INSTITUTIONAL',
    name: 'Institutional',
    threshold: 50000,
    earningMultiplier: 4.0,
    referralMultiplier: 2.5,
    withdrawalLimit: 10000,
    benefits: ['4x earning rate', '2.5x referral rewards', 'Institutional privileges']
  }
];

interface CapacityState {
  // Current capacity state
  currentCapacity: number;
  todayCapacityEarned: number;
  capacityLevel: CapacityLevel;
  dailyCycleStatus: DailyCycleStatus;
  consecutiveDays: number;
  
  // History
  transactions: CapacityTransaction[];
  opportunities: CapacityOpportunity[];
  
  // Multipliers (affected by capacity level)
  earningMultiplier: number;
  referralMultiplier: number;
  withdrawalLimit: number;
  
  // Actions
  activateDailyCycle: () => void;
  addCapacity: (source: CapacitySource, amount: number, description: string, isPaid?: boolean) => void;
  claimSettlement: () => void;
  purchaseCapacityBoost: (amount: number, price: number) => void;
  purchaseCapacityPack: (amount: number, price: number) => void;
  purchaseReferralAccelerator: (duration: number, price: number) => void;
  upgradeMembership: (level: CapacityLevel, price: number) => void;
  refreshOpportunities: () => void;
  resetDailyCycle: () => void;
  updateCapacityLevel: () => void;
}

export const useCapacityStore = create<CapacityState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentCapacity: 0,
      todayCapacityEarned: 0,
      capacityLevel: 'SEED',
      dailyCycleStatus: 'NOT_ACTIVATED',
      consecutiveDays: 0,
      transactions: [],
      opportunities: [],
      earningMultiplier: 1.0,
      referralMultiplier: 1.0,
      withdrawalLimit: 100,

      // Activate daily cycle
      activateDailyCycle: () => {
        set({
          dailyCycleStatus: 'ACTIVATED',
          todayCapacityEarned: 0
        });
        
        // Award daily login capacity
        get().addCapacity('DAILY_LOGIN', 10, 'Daily login bonus');
        
        // Refresh opportunities
        get().refreshOpportunities();
      },

      // Add capacity from any source
      addCapacity: (source, amount, description, isPaid = false) => {
        const transaction: CapacityTransaction = {
          id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          source,
          amount,
          timestamp: Date.now(),
          description,
          isPaid
        };

        set((state) => ({
          currentCapacity: state.currentCapacity + amount,
          todayCapacityEarned: state.todayCapacityEarned + amount,
          transactions: [transaction, ...state.transactions],
          dailyCycleStatus: 'CAPACITY_EARNED'
        }));

        // Update capacity level after adding capacity
        get().updateCapacityLevel();
      },

      // Claim daily settlement
      claimSettlement: () => {
        set({
          dailyCycleStatus: 'SETTLEMENT_CLAIMED'
        });
      },

      // Purchase temporary capacity boost
      purchaseCapacityBoost: (amount, price) => {
        // In production, this would integrate with payment system
        get().addCapacity('CAPACITY_BOOST', amount, 'Capacity boost purchase', true);
      },

      // Purchase permanent capacity pack
      purchaseCapacityPack: (amount, price) => {
        // In production, this would integrate with payment system
        get().addCapacity('CAPACITY_PACK', amount, 'Capacity pack purchase', true);
      },

      // Purchase referral accelerator
      purchaseReferralAccelerator: (duration, price) => {
        // In production, this would integrate with payment system
        get().addCapacity('REFERRAL_ACCELERATOR', 50, `Referral accelerator (${duration} days)`, true);
      },

      // Upgrade membership
      upgradeMembership: (level, price) => {
        // In production, this would integrate with payment system
        set({ capacityLevel: level });
        get().updateCapacityLevel();
      },

      // Refresh daily opportunities
      refreshOpportunities: () => {
        const state = get();
        const opportunities: CapacityOpportunity[] = [
          {
            id: 'op_daily_login',
            source: 'DAILY_LOGIN',
            title: 'Daily Login',
            description: 'Log in daily to earn capacity',
            reward: 10,
            isPaid: false,
            isAvailable: state.dailyCycleStatus === 'NOT_ACTIVATED',
            icon: '🔥'
          },
          {
            id: 'op_deposit',
            source: 'DEPOSIT',
            title: 'Make a Deposit',
            description: 'Deposit USDT to earn capacity',
            reward: 50,
            isPaid: false,
            isAvailable: true,
            icon: '💰'
          },
          {
            id: 'op_referral',
            source: 'REFERRAL_SIGNUP',
            title: 'Refer a Friend',
            description: 'Refer a verified user',
            reward: 100,
            isPaid: false,
            isAvailable: true,
            icon: '👥'
          },
          {
            id: 'op_consecutive',
            source: 'CONSECUTIVE_DAYS',
            title: 'Stay Active',
            description: 'Maintain consecutive daily activity',
            reward: 25,
            isPaid: false,
            isAvailable: true,
            progress: state.consecutiveDays,
            target: 7,
            icon: '📅'
          },
          {
            id: 'op_boost',
            source: 'CAPACITY_BOOST',
            title: 'Capacity Boost',
            description: 'Temporary 24-hour capacity increase',
            reward: 200,
            isPaid: true,
            price: 4.99,
            isAvailable: true,
            icon: '⚡'
          },
          {
            id: 'op_pack',
            source: 'CAPACITY_PACK',
            title: 'Capacity Pack',
            description: 'Permanent capacity increase',
            reward: 500,
            isPaid: true,
            price: 19.99,
            isAvailable: true,
            icon: '📦'
          },
          {
            id: 'op_referral_accel',
            source: 'REFERRAL_ACCELERATOR',
            title: 'Referral Accelerator',
            description: '7-day referral capacity multiplier',
            reward: 150,
            isPaid: true,
            price: 9.99,
            isAvailable: true,
            icon: '🚀'
          }
        ];

        set({ opportunities });
      },

      // Reset daily cycle (for testing or new day)
      resetDailyCycle: () => {
        set({
          dailyCycleStatus: 'NOT_ACTIVATED',
          todayCapacityEarned: 0
        });
      },

      // Update capacity level based on current capacity
      updateCapacityLevel: () => {
        const state = get();
        let newLevel: CapacityLevel = 'SEED';
        
        for (const levelConfig of DEFAULT_CAPACITY_LEVELS) {
          if (state.currentCapacity >= levelConfig.threshold) {
            newLevel = levelConfig.level;
          }
        }

        const levelConfig = DEFAULT_CAPACITY_LEVELS.find(l => l.level === newLevel);
        
        set({
          capacityLevel: newLevel,
          earningMultiplier: levelConfig?.earningMultiplier || 1.0,
          referralMultiplier: levelConfig?.referralMultiplier || 1.0,
          withdrawalLimit: levelConfig?.withdrawalLimit || 100
        });
      }
    }),
    {
      name: 'capacity-storage',
      partialize: (state) => ({
        currentCapacity: state.currentCapacity,
        capacityLevel: state.capacityLevel,
        consecutiveDays: state.consecutiveDays,
        transactions: state.transactions
      })
    }
  )
);
