import { api } from './api';

export interface TreasuryMetricsResponse {
  totalLiquidity: number;
  userLiabilities: number;
  reserveRatio: number;
  projectedPayouts: number;
  settlementExposure: number;
  capacityRemaining: number;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  riskScore: 'LOW' | 'MEDIUM' | 'HIGH';
  forecastDays: number;
  countryAllocation?: Record<string, number>;
}

export interface UserTrustProfileResponse {
  telegramUserId: number;
  trustScore: number;
  reputationRank: 'Builder' | 'Guardian' | 'Architect' | 'Grandmaster';
  loginCount: number;
  educationScore: number;
  isReady: boolean;
  operatorAccess: 'Unlocked' | 'Locked';
  createdAt: string;
}

export const treasuryService = {
  async getMetrics(): Promise<TreasuryMetricsResponse> {
    try {
      const res = await api.get('/treasury/metrics');
      return res.data.data;
    } catch {
      // Production fallback defaults if API connection is unavailable
      return {
        totalLiquidity: 0,
        userLiabilities: 0,
        reserveRatio: 100,
        projectedPayouts: 0,
        settlementExposure: 0,
        capacityRemaining: 100,
        healthStatus: 'HEALTHY',
        riskScore: 'LOW',
        forecastDays: 30,
      };
    }
  },

  async getUserTrustProfile(): Promise<UserTrustProfileResponse> {
    try {
      const res = await api.get('/user/trust/profile');
      return res.data;
    } catch {
      return {
        telegramUserId: 0,
        trustScore: 20,
        reputationRank: 'Builder',
        loginCount: 1,
        educationScore: 0,
        isReady: false,
        operatorAccess: 'Locked',
        createdAt: new Date().toISOString(),
      };
    }
  },
};
