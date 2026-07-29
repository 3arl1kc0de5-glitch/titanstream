export type Role = 'USER' | 'ADMIN';
export type Currency = 'USDT' | 'TON';
export type Network = 'TON' | 'BEP20';
export type TxStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type QuestType = 'OURS' | 'PARTNER';
export type QuestRewardType = 'BOOST' | 'CRYSTALS';
export type QuestStatus = 'IN_PROGRESS' | 'CLAIMABLE' | 'CLAIMED';

export interface User {
  id: string; // BigInt serialized as string for safety in JSON
  username?: string;
  firstName: string;
  lastName?: string;
  role: Role;
  referrerId?: string;
  invitedCount: number;
  referralBoostMultiplier: number;
  languageCode: string;
  createdAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  usdtBalance: number;
  tonBalance: number;
  crystalsBalance: number;
  referralEarnedUsdt: number;
  referralEarnedTon: number;
}

export interface MiningSession {
  id: string;
  userId: string;
  activeCurrency: Currency;
  baseSpeedGhs: number;
  coolerMultiplier: number;
  coolerLastTap: string;
  lastSyncAt: string;
}

export interface Quest {
  id: string;
  type: QuestType;
  category: string;
  title: string;
  subtitle: string;
  rewardType: QuestRewardType;
  rewardValue: number;
  targetCount: number;
  externalUrl?: string;
}

export interface UserQuest {
  id: string;
  userId: string;
  questId: string;
  progressCount: number;
  status: QuestStatus;
  updatedAt: string;
  quest?: Quest;
}

export interface BoostPack {
  id: string;
  multiplier: number;
  durationDays: number;
  priceUsd: number;
  originalPriceUsd?: number;
  isPromo: boolean;
  promoBadge?: string;
}

export interface UserBoost {
  id: string;
  userId: string;
  packId: string;
  activatedAt: string;
  expiresAt: string;
  pack?: BoostPack;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  currency: Currency;
  amount: number;
  network: Network;
  walletAddress: string;
  txHash?: string;
  status: TxStatus;
  createdAt: string;
}
