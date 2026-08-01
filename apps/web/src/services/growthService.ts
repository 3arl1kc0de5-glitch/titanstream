import { api } from './api';

export interface RetentionCohort {
  cohortDate: string;
  totalUsers: number;
  d1RetentionPercent: number;
  d7RetentionPercent: number;
  d30RetentionPercent: number;
}

export interface FunnelStage {
  stageName: string;
  userCount: number;
  conversionPercent: number;
  dropoffPercent: number;
}

export interface GrowthAnalyticsOverview {
  totalUsers: number;
  activeUsersMonthly: number;
  kFactorViralCoefficient: number;
  totalReferralBonusDistributedUsdt: number;
  cohorts: RetentionCohort[];
  funnel: FunnelStage[];
  topReferrers: Array<{ telegramUserId: string; username: string; totalReferees: number; earningsUsdt: number }>;
}

export interface ReferredByInfo {
  referrerId: string;
  name: string;
  username?: string;
  joinedAt: string;
  status: string;
}

export interface ReferralSummaryItem {
  id: string;
  refereeId: string;
  refereeName: string;
  refereeUsername?: string;
  status: string;
  createdAt: string;
  qualifiedAt?: string;
  rewardedAt?: string;
}

export interface ReferralSummary {
  referralCode: string;
  referralLink: string;
  totalInvited: number;
  qualifiedCount: number;
  payingCount: number;
  totalEarnedUSDT: number;
  referredBy?: ReferredByInfo | null;
  referrals: ReferralSummaryItem[];
}

export interface GrowthProfile {
  telegramUserId: string;
  trustScore: number;
  level: string;
  levelName: string;
  benefits: string[];
  nextLevel?: any;
  completedSettlements: number;
  accountAgeDays: number;
  totalVolumeUSDT: number;
  referrals: {
    code: string;
    link: string;
    totalInvited: number;
    qualifiedCount: number;
    totalEarnedUSDT: number;
  };
  rewardsCount: number;
}

export interface RewardItem {
  id: string;
  telegramUserId: string;
  rewardType: string;
  amount: string;
  assetCode: string;
  status: string;
  reference: string;
  createdAt: string;
}

export interface QualificationStatus {
  withdrawal: any;
  discount: any;
}

export const growthService = {
  async getProfile(): Promise<GrowthProfile> {
    const res = await api.get('/growth/profile');
    return res.data;
  },

  async getReferrals(): Promise<ReferralSummary> {
    const res = await api.get('/growth/referrals');
    return res.data;
  },

  async getRewards(): Promise<RewardItem[]> {
    const res = await api.get('/growth/rewards');
    return res.data;
  },

  async getQualification(): Promise<QualificationStatus> {
    const res = await api.get('/growth/qualification');
    return res.data;
  },

  async getAnalyticsOverview(): Promise<GrowthAnalyticsOverview> {
    const res = await api.get('/admin/growth/analytics-overview');
    return res.data.data;
  },

  async getCohorts(): Promise<RetentionCohort[]> {
    const res = await api.get('/admin/growth/cohorts');
    return res.data.data;
  },

  async getFunnel(): Promise<FunnelStage[]> {
    const res = await api.get('/admin/growth/conversion-funnel');
    return res.data.data;
  },
};
