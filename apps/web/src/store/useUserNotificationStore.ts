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
  isModalOpen: boolean;

  // Actions
  fetchNotifications: () => Promise<void>;
  addNotification: (notif: Omit<UserNotification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (id: string) => void;
  setModalOpen: (open: boolean) => void;
}

// Map template codes to categories, friendly titles, and action tabs
const getNotificationMetadata = (templateCode: string): { title: string; category: UserNotificationCategory; actionTab?: string } => {
  switch (templateCode) {
    // Deposits / Funding
    case 'SETTLEMENT_CREATED':
    case 'DEPOSIT_PENDING':
      return { title: 'Funding Initiated', category: 'Deposit', actionTab: 'wallet' };
    case 'SETTLEMENT_APPROVED':
    case 'DEPOSIT_APPROVED':
    case 'WALLET_FUNDED':
    case 'FINANCIAL_DEPOSIT_CONFIRMED':
      return { title: 'Deposit Confirmed', category: 'Deposit', actionTab: 'wallet' };
    case 'DEPOSIT_REJECTED':
      return { title: 'Deposit Failed', category: 'Deposit', actionTab: 'wallet' };

    // Withdrawals
    case 'WITHDRAWAL_REQUESTED':
    case 'SECURITY_WITHDRAWAL_REQUESTED':
      return { title: 'Withdrawal Started', category: 'Withdrawal', actionTab: 'wallet' };
    case 'WITHDRAWAL_COMPLETED':
    case 'WITHDRAWAL_APPROVED':
    case 'FINANCIAL_WITHDRAWAL_COMPLETED':
      return { title: 'Withdrawal Completed', category: 'Withdrawal', actionTab: 'wallet' };
    case 'WITHDRAWAL_REJECTED':
      return { title: 'Withdrawal Rejected', category: 'Withdrawal', actionTab: 'wallet' };

    // Machines / Fleet
    case 'MACHINE_PURCHASED':
      return { title: 'Machine Purchased', category: 'Machine', actionTab: 'mine' };
    case 'MACHINE_ACTIVATED':
      return { title: 'Machine Activated', category: 'Machine', actionTab: 'mine' };
    case 'DAILY_EARNINGS':
      return { title: 'Daily Yield Credited', category: 'Reward', actionTab: 'mine' };

    // Referrals
    case 'REFERRAL_JOINED':
      return { title: 'New Partner Joined', category: 'Referral', actionTab: 'friends' };
    case 'REFERRAL_MILESTONE_REACHED':
    case 'GROWTH_REFERRAL_REWARD':
    case 'REFERRAL_COMPLETED':
      return { title: 'Referral Reward Unlocked', category: 'Referral', actionTab: 'friends' };

    // Trust / Growth
    case 'LEVEL_UPGRADED':
    case 'GROWTH_TRUST_LEVEL_UPGRADED':
      return { title: 'Trust Level Upgraded', category: 'Reward', actionTab: 'growth' };

    // Support
    case 'SUPPORT_UPDATE':
      return { title: 'Support Response', category: 'Support', actionTab: 'growth' };

    // System / Security / Treasury
    case 'ACCOUNT_CREATED':
      return { title: 'Welcome to TitanStream', category: 'System', actionTab: 'growth' };
    case 'SECURITY_NEW_LOGIN':
      return { title: 'New Login Alert', category: 'System', actionTab: 'growth' };
    case 'MISSION_CONTROL_ALERT':
    case 'TREASURY_UPDATE':
      return { title: 'Treasury Alert', category: 'System', actionTab: 'treasury' };
    case 'ADMIN_ACTION':
      return { title: 'Account Adjustment', category: 'System', actionTab: 'growth' };
    case 'SYSTEM_MAINTENANCE':
      return { title: 'Maintenance Notice', category: 'System', actionTab: 'growth' };
    case 'PLATFORM_ANNOUNCEMENT':
      return { title: 'Platform Announcement', category: 'System', actionTab: 'growth' };

    default:
      return { title: 'System Alert', category: 'System', actionTab: 'growth' };
  }
};

export const useUserNotificationStore = create<UserNotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  isModalOpen: false,
  setModalOpen: (open) => set({ isModalOpen: open }),

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
