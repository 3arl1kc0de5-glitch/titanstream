import { create } from 'zustand';
import { growthService, type ReferralSummary } from '../services/growthService';

interface ReferralItem {
  id: string;
  refereeId: string;
  refereeName: string;
  refereeUsername?: string;
  status: string;
  createdAt: string;
}

interface ReferredByInfo {
  referrerId: string;
  name: string;
  username?: string;
  joinedAt: string;
  status: string;
}

interface ReferralState {
  invitedCount: number;
  computeBoost: number;
  earnedUsdt: number;
  earnedTon: number;
  referralLink: string;
  referralCode: string;
  referredBy: ReferredByInfo | null;
  referrals: ReferralItem[];
  isLoading: boolean;
  error: string | null;

  fetchReferrals: () => Promise<void>;
  tickEarnings: (usdtDelta: number, tonDelta: number) => void;
}

export const useReferralStore = create<ReferralState>((set) => ({
  invitedCount: 0,
  computeBoost: 1.0,
  earnedUsdt: 0,
  earnedTon: 0,
  referralLink: '',
  referralCode: '',
  referredBy: null,
  referrals: [],
  isLoading: false,
  error: null,

  fetchReferrals: async () => {
    set({ isLoading: true, error: null });
    try {
      const summary: ReferralSummary = await growthService.getReferrals();
      const boost = Number((1 + (summary.totalInvited || 0) * 0.02).toFixed(2));

      set({
        invitedCount: summary.totalInvited || 0,
        computeBoost: boost,
        earnedUsdt: summary.totalEarnedUSDT || 0,
        earnedTon: 0,
        referralLink: summary.referralLink || '',
        referralCode: summary.referralCode || '',
        referredBy: summary.referredBy || null,
        referrals: (summary.referrals || []).map((r) => ({
          id: r.id,
          refereeId: r.refereeId,
          refereeName: r.refereeName,
          refereeUsername: r.refereeUsername,
          status: r.status,
          createdAt: r.createdAt,
        })),
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to load referral data', isLoading: false });
    }
  },

  tickEarnings: (usdtDelta, tonDelta) =>
    set((state) => ({
      earnedUsdt: state.earnedUsdt + usdtDelta,
      earnedTon: state.earnedTon + tonDelta,
    })),
}));
