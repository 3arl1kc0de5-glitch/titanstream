import { api } from './api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WithdrawalRequest {
  asset: string;                 // 'USDT'
  amount: string;                // '50.00'
  destination: string;           // Mobile money number, wallet address, etc.
  destinationType: string;       // 'MOBILE_MONEY' | 'CRYPTO_WALLET' | 'BANK_TRANSFER'
  country?: string;              // 'UG'
  network?: string;              // 'MTN' | 'AIRTEL'
  note?: string;
}

export interface WithdrawalSession {
  withdrawalId: string;
  status: string;                // 'CREATED' | 'RISK_CHECK' | 'PENDING_APPROVAL' | 'PROCESSING' | 'COMPLETED' | 'REJECTED'
  asset: string;
  amount: string;
  destination: string;
  destinationType: string;
  fee: string;
  netAmount: string;             // amount - fee
  createdAt: string;
  completedAt?: string;
  rejectionReason?: string;
  reference: string;
}

export interface WithdrawalLimits {
  minAmount: number;
  maxAmount: number;
  dailyLimit: number;
  dailyUsed: number;
  dailyRemaining: number;
}

// ─── Production Withdrawal Service ───────────────────────────────────────────
// Every withdrawal creates a real record with risk checks and provider execution.
// No simulated withdrawals.

export const withdrawalService = {
  /**
   * Create a new withdrawal request.
   * Backend endpoint: POST /financial/withdrawal
   * Flow: Create → Risk check → Approval (if required) → Provider execution → Ledger → Completed
   */
  async createWithdrawal(request: WithdrawalRequest): Promise<WithdrawalSession> {
    const response = await api.post('/financial/withdrawal', request);
    return response.data.data;
  },

  /**
   * Get status of a specific withdrawal.
   * Backend endpoint: GET /financial/withdrawal/:id
   */
  async getWithdrawal(withdrawalId: string): Promise<WithdrawalSession> {
    const response = await api.get(`/financial/withdrawal/${withdrawalId}`);
    return response.data.data;
  },

  /**
   * Get withdrawal history for the current user.
   * Backend endpoint: GET /financial/withdrawal/history
   */
  async getHistory(limit = 50, offset = 0): Promise<{ items: WithdrawalSession[]; pagination: { limit: number; offset: number; total?: number } }> {
    const response = await api.get('/financial/withdrawal/history', {
      params: { limit, offset },
    });
    return response.data.data;
  },

  /**
   * Get current withdrawal limits for the user.
   * Backend endpoint: GET /financial/withdrawal/limits
   */
  async getLimits(): Promise<WithdrawalLimits> {
    const response = await api.get('/financial/withdrawal/limits');
    return response.data.data;
  },

  /**
   * Cancel a pending withdrawal (only if status allows).
   * Backend endpoint: POST /financial/withdrawal/:id/cancel
   */
  async cancelWithdrawal(withdrawalId: string): Promise<WithdrawalSession> {
    const response = await api.post(`/financial/withdrawal/${withdrawalId}/cancel`);
    return response.data.data;
  },
};
