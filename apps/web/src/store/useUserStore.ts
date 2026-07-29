import { create } from 'zustand';

interface UserState {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  languageCode: string;
  role: 'USER' | 'ADMIN';
  isAuthenticated: boolean;
  setUser: (user: Partial<UserState>) => void;
}

export const useUserStore = create<UserState>((set) => ({
  id: '18273645',
  username: 'demo_user',
  firstName: 'Demo',
  lastName: 'User',
  languageCode: 'en',
  role: 'USER',
  isAuthenticated: true,
  setUser: (user) => set((state) => ({ ...state, ...user })),
}));
