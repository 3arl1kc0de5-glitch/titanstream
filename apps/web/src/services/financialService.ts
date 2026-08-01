import { api } from './api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserBalance {
  id?: string;
  telegramUserId?: string;
  usdtBalance: number;
  tonBalance: number;
  crystalsBalance: number;
  availableUsdt: number;
  pendingUsdt: number;
  lockedUsdt: number;
  lifetimeDeposits?: number;
  lifetimeWithdrawals?: number;
  totalRewards?: number;
  activeMachines?: number;
  updatedAt?: string;
}

export interface TransactionRecord {
  id: string;
  financialAccountId?: string;
  type: string;
  asset: string;
  amount: string | number;
  status: string;
  reference: string;
  createdAt: string;
  description?: string;
}

export interface TransactionsResponse {
  items: TransactionRecord[];
  pagination: {
    limit: number;
    offset: number;
    total?: number;
  };
}

// ─── Production Financial Service ────────────────────────────────────────────
// Every method calls the real backend API.
// No mock data. No fake balances. Real errors on failure.

export const financialService = {
  /**
   * Fetch derived balances from the Balance Engine.
   * Backend endpoint: GET /financial/balance
   * Balance is computed from double-entry ledger — never hardcoded.
   */
  async getBalance(): Promise<UserBalance> {
    const response = await api.get('/financial/balance');
    return response.data.data;
  },

  /**
   * Fetch transaction history from the Ledger/Transaction Service.
   * Backend endpoint: GET /financial/transactions
   */
  async getTransactions(limit = 50, offset = 0): Promise<TransactionsResponse> {
    const response = await api.get('/financial/transactions', {
      params: { limit, offset },
    });
    return response.data.data;
  },

  /**
   * Fetch ledger entries for the current user.
   * Backend endpoint: GET /financial/ledger
   */
  async getLedger(limit = 50, offset = 0): Promise<TransactionsResponse> {
    const response = await api.get('/financial/ledger', {
      params: { limit, offset },
    });
    return response.data.data;
  },
};
