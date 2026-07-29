import { create } from 'zustand';
import { api } from '../services/api';

export type UserNotificationCategory =
  | 'Deposit'
  | 'Withdrawal'
  | 'Reward'
  | 'Machine'
  | 'Referral'
  | 'Support'
  | 'System';

export interface UserNotification {
  id: string;
  title: string;
  message: string;
  category: UserNotificationCategory;
  createdAt: string;
  read: boolean;
  actionTab?: string;
}

interface UserNotificationState {
  notifications: UserNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchNotifications: () => Promise<void>;
  addNotification: (notif: Omit<UserNotification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (id: string) => void;
}

// Map template codes to categories and friendly titles
const getNotificationMetadata = (templateCode: string): { title: string; category: UserNotificationCategory; actionTab?: string } => {
  switch (templateCode) {
    case 'SETTLEMENT_CREATED':
      return { title: 'Funding Initiated', category: 'Deposit', actionTab: 'wallet' };
    case 'SETTLEMENT_APPROVED':
      return { title: 'USDT Deposit Accredited', category: 'Deposit', actionTab: 'wallet' };
    case 'WITHDRAWAL_REQUESTED':
      return { title: 'Withdrawal Started', category: 'Withdrawal', actionTab: 'wallet' };
    case 'WITHDRAWAL_COMPLETED':
      return { title: 'Withdrawal Processed', category: 'Withdrawal', actionTab: 'wallet' };
    default:
      return { title: 'System Alert', category: 'System' };
  }
};

export const useUserNotificationStore = create<UserNotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  fetchNotifications: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/notifications');
      const data = response.data || [];
      
      const mapped: UserNotification[] = data.map((record: any) => {
        const meta = getNotificationMetadata(record.templateCode);
        return {
          id: record.id,
          title: meta.title,
          message: record.message,
          category: meta.category,
          createdAt: record.createdAt,
          read: record.status === 'READ',
          actionTab: meta.actionTab,
        };
      });

      set({
        notifications: mapped,
        unreadCount: mapped.filter((n) => !n.read).length,
        isLoading: false,
      });
    } catch (err: any) {
      console.warn('Failed to fetch notifications from engine:', err?.message);
      set({ isLoading: false });
    }
  },

  addNotification: (notif) => {
    const newNotif: UserNotification = {
      ...notif,
      id: `un-${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    set((state) => {
      const updated = [newNotif, ...state.notifications];
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },

  markAsRead: async (id) => {
    // Optimistic UI update
    set((state) => {
      const updated = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });

    try {
      await api.post(`/notifications/${id}/read`);
    } catch (err: any) {
      console.error('Failed to mark notification as read:', err);
    }
  },

  markAllAsRead: async () => {
    // Optimistic UI update
    set((state) => {
      const updated = state.notifications.map((n) => ({ ...n, read: true }));
      return {
        notifications: updated,
        unreadCount: 0,
      };
    });

    try {
      await api.post('/notifications/read-all');
    } catch (err: any) {
      console.error('Failed to mark all notifications as read:', err);
    }
  },

  clearNotification: (id) => {
    set((state) => {
      const updated = state.notifications.filter((n) => n.id !== id);
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },
}));
