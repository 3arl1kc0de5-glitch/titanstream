import { create } from 'zustand';

type TabId = 'friends' | 'boost' | 'mine' | 'treasury' | 'wallet' | 'growth';

interface NavigationState {
  activeTab: TabId;
  showGames: boolean;
  setActiveTab: (tab: TabId) => void;
  openGames: () => void;
  closeGames: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeTab: 'mine',
  showGames: false,
  setActiveTab: (tab) => set({ activeTab: tab, showGames: false }),
  openGames: () => set({ showGames: true }),
  closeGames: () => set({ showGames: false }),
}));
