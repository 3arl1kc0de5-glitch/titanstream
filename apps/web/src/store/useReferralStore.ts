import { create } from 'zustand';

interface ReferralState {
  invitedCount: number;
  computeBoost: number;
  earnedUsdt: number;
  earnedTon: number;
  referralLink: string;
  referralCode: string;
  referrals: Array<{ id: string; username: string; crystals: number }>;
  tickEarnings: (usdtDelta: number, tonDelta: number) => void;
}

export const useReferralStore = create<ReferralState>((set) => ({
  invitedCount: 3,
  computeBoost: 1.06,
  earnedUsdt: 0.12450,
  earnedTon: 0.08200,
  referralLink: 'https://t.me/TS_usdt_bot?start=ref_Z72G1X5A',
  referralCode: 'Z72G1X5A',
  referrals: [
    { id: '1', username: 'Alex_Cloud', crystals: 45 },
    { id: '2', username: 'VaporTech', crystals: 12 },
    { id: '3', username: 'Cloud_Pro', crystals: 30 },
  ],
  tickEarnings: (usdtDelta, tonDelta) =>
    set((state) => ({
      earnedUsdt: state.earnedUsdt + usdtDelta,
      earnedTon: state.earnedTon + tonDelta,
    })),
}));
