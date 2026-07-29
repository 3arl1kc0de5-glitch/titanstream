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

export const growthService = {
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
