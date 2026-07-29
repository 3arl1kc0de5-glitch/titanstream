import { create } from 'zustand';

interface NotificationState {
  questBadgeCount: number;
  oursCount: number;
  partnerCount: number;
  setQuestBadge: (count: number) => void;
  decrementBadge: (type: 'OURS' | 'PARTNER') => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  questBadgeCount: 25,
  oursCount: 21,
  partnerCount: 4,
  setQuestBadge: (count) => set({ questBadgeCount: count }),
  decrementBadge: (type) =>
    set((state) => {
      const ours = type === 'OURS' ? Math.max(0, state.oursCount - 1) : state.oursCount;
      const partner = type === 'PARTNER' ? Math.max(0, state.partnerCount - 1) : state.partnerCount;
      return {
        oursCount: ours,
        partnerCount: partner,
        questBadgeCount: Math.max(0, state.questBadgeCount - 1),
      };
    }),
}));
