import { create } from 'zustand';
import { financialService, type TransactionRecord } from '../services/financialService';
import { settlementService, type SettlementSessionView } from '../services/settlementService';
import { useTreasuryStore } from './useTreasuryStore';
import { useUserNotificationStore } from './useUserNotificationStore';
const ACTIVE_STATUS_SET = new Set([
  'CREATED',
  'INITIALIZED',
  'OPERATOR_ASSIGNED',
  'MERCHANT_ASSIGNED',
  'WAITING_FOR_PAYMENT',
  'WAITING_PAYMENT',
  'VERIFYING',
  'APPROVED',
  'POSTED',
  'PAYMENT_RECEIVED',
  'USDT_SENT',
]);

interface WalletState {
  usdtBalance: number;
  tonBalance: number;
  crystalsBalance: number;
  referralEarnedUsdt: number;
  referralEarnedTon: number;
  pendingUsdt: number;
  lifetimeDeposits: number;
  lifetimeWithdrawals: number;
  totalRewards: number;
  activeMachines: number;
  
  // Settlements & Transactions
  activeSession: SettlementSessionView | null;
  pendingSettlements: SettlementSessionView[];
  settlementHistory: SettlementSessionView[];
  transactions: TransactionRecord[];
  
  // Status
  isLoadingBalance: boolean;
  isLoadingSettlements: boolean;
  isLoadingTransactions: boolean;
  error: string | null;

  // Actions
  updateBalance: (updates: Partial<WalletState>) => void;
  accreditUserBalance: (amount: number, reason?: string) => void;
  fetchBalanceFromEngine: () => Promise<void>;
  fetchSettlementHistory: () => Promise<void>;
  fetchTransactions: (limit?: number, offset?: number) => Promise<void>;
  setActiveSession: (session: SettlementSessionView | null) => void;
  pollActiveSession: (settlementId: string) => Promise<SettlementSessionView | null>;
  cancelSession: (settlementId: string) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  // PRODUCTION: All balances start at zero. Populated from Balance Engine on mount.
  usdtBalance: 0,
  tonBalance: 0,
  crystalsBalance: 0,
  referralEarnedUsdt: 0,
  referralEarnedTon: 0,
  pendingUsdt: 0,
  lifetimeDeposits: 0,
  lifetimeWithdrawals: 0,
  totalRewards: 0,
  activeMachines: 0,

  activeSession: null,
  pendingSettlements: [],
  settlementHistory: [],
  transactions: [],

  isLoadingBalance: false,
  isLoadingSettlements: false,
  isLoadingTransactions: false,
  error: null,

  updateBalance: (updates) => set((state) => ({ ...state, ...updates })),

  accreditUserBalance: (amount, reason = 'Admin Wallet Accreditation') => {
    const current = get().usdtBalance;
    const newBal = Math.max(0, current + amount);
    const newTx: TransactionRecord = {
      id: `admin_credit_${Date.now()}`,
      reference: `ACCREDIT-${Date.now().toString().slice(-6)}`,
      amount: amount,
      type: 'Admin Accreditation',
      asset: 'USDT',
      status: 'POSTED',
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      usdtBalance: newBal,
      transactions: [newTx, ...state.transactions],
    }));

    useTreasuryStore.getState().adjustTreasuryStats('DEPOSIT', amount);

    // Real-time User Notification Trigger
    useUserNotificationStore.getState().addNotification({
      title: 'USDT Balance Accredited',
      message: `+$${amount.toFixed(2)} USDT has been accredited to your wallet balance by admin (${reason}).`,
      category: 'Deposit',
      actionTab: 'wallet',
    });
  },

  /**
   * Fetch derived balances strictly from the Balance Engine (GET /financial/balance)
   */
  fetchBalanceFromEngine: async () => {
    set({ isLoadingBalance: true, error: null });
    try {
      const data = await financialService.getBalance();
      
      let usdtVal = 0;
      let tonVal = 0;
      let pendingUsdtVal = 0;

      // Handle the new production array response or legacy fallback object response
      if (data && Array.isArray((data as any).balances)) {
        const usdtObj = (data as any).balances.find((b: any) => b.assetCode === 'USDT');
        const tonObj = (data as any).balances.find((b: any) => b.assetCode === 'TON');
        if (usdtObj) {
          usdtVal = parseFloat(usdtObj.availableBalance || '0');
          pendingUsdtVal = parseFloat(usdtObj.pendingBalance || '0');
        }
        if (tonObj) {
          tonVal = parseFloat(tonObj.availableBalance || '0');
        }
      } else if (data) {
        usdtVal = typeof data.usdtBalance === 'number' ? data.usdtBalance : parseFloat(String(data.usdtBalance || 0));
        tonVal = typeof data.tonBalance === 'number' ? data.tonBalance : parseFloat(String(data.tonBalance || 0));
        pendingUsdtVal = data.pendingUsdt ? parseFloat(String(data.pendingUsdt)) : 0;
      }

      // Fetch transaction history to dynamically compute lifetime stats
      let txs: TransactionRecord[] = [];
      try {
        const txRes = await financialService.getTransactions(100, 0);
        txs = txRes.items || [];
      } catch (txErr) {
        txs = get().transactions;
      }

      // Compute lifetime deposits, withdrawals, rewards, and active machines
      let depTotal = 0;
      let wthTotal = 0;
      let rwdTotal = 0;
      let machCount = 0;

      txs.forEach((tx) => {
        const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(String(tx.amount || 0));
        if (tx.type === 'DEPOSIT' || tx.type === 'Admin Accreditation') {
          depTotal += amount;
        } else if (tx.type === 'WITHDRAWAL') {
          wthTotal += amount;
        } else if (tx.type === 'REFERRAL_REWARD' || tx.type === 'REWARD' || tx.type === 'SYSTEM_ALLOCATION') {
          rwdTotal += amount;
        } else if (tx.type === 'BOOST_PURCHASE') {
          machCount += 1;
        }
      });

      set({
        usdtBalance: usdtVal,
        tonBalance: tonVal,
        crystalsBalance: data.crystalsBalance ?? get().crystalsBalance,
        pendingUsdt: pendingUsdtVal,
        transactions: txs,
        lifetimeDeposits: depTotal,
        lifetimeWithdrawals: wthTotal,
        totalRewards: rwdTotal,
        activeMachines: machCount,
        isLoadingBalance: false,
      });
    } catch (err: any) {
      console.warn('Balance Engine offline or unauthenticated, falling back gracefully:', err?.message);
      set({ isLoadingBalance: false });
    }
  },

  /**
   * Fetch settlement history from Universal Settlement Provider API (GET /settlement/history)
   */
  fetchSettlementHistory: async () => {
    set({ isLoadingSettlements: true, error: null });
    try {
      const history = await settlementService.getHistory();
      const pending = history.filter((item) => ACTIVE_STATUS_SET.has(item.status));
      set({
        settlementHistory: history,
        pendingSettlements: pending,
        isLoadingSettlements: false,
      });
    } catch (err: any) {
      console.warn('Settlement history fetch notice:', err?.message);
      set({ isLoadingSettlements: false });
    }
  },

  /**
   * Fetch transactions from Ledger / Transaction Service (GET /financial/transactions)
   */
  fetchTransactions: async (limit = 50, offset = 0) => {
    set({ isLoadingTransactions: true, error: null });
    try {
      const res = await financialService.getTransactions(limit, offset);
      set({
        transactions: res.items || [],
        isLoadingTransactions: false,
      });
    } catch (err: any) {
      console.warn('Transaction history fetch notice:', err?.message);
      set({ isLoadingTransactions: false });
    }
  },

  /**
   * Set active session in client store
   */
  setActiveSession: (session) => set({ activeSession: session }),

  /**
   * Poll specific active session and update state
   */
  pollActiveSession: async (settlementId) => {
    try {
      const session = await settlementService.getSession(settlementId);
      set({ activeSession: session });
      
      // If completed, refresh balance from Engine and update stats!
      if (session.status === 'COMPLETED') {
        get().fetchBalanceFromEngine();
        get().fetchSettlementHistory();
        
        const depVal = parseFloat(session.expectedCryptoAmount || '0');
        if (depVal > 0) {
          useTreasuryStore.getState().adjustTreasuryStats('DEPOSIT', depVal);
          useTreasuryStore.getState().adjustTrustScore(3);
        }
      }
      return session;
    } catch (err: any) {
      console.error('Failed to poll session status:', err);
      return null;
    }
  },

  /**
   * Cancel active session
   */
  cancelSession: async (settlementId) => {
    try {
      const updated = await settlementService.cancelSession(settlementId);
      set({ activeSession: updated });
      get().fetchSettlementHistory();
    } catch (err: any) {
      console.error('Failed to cancel session:', err);
    }
  },
}));
