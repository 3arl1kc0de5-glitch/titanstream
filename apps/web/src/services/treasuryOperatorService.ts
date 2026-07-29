import { api } from './api';
import { type PaymentOrderRecord } from './paymentOrderService';

export type DutyStatus = 'ACTIVE' | 'ON_CALL' | 'OFF_DUTY';

export interface TreasuryOperatorProfile {
  id: string;
  name: string;
  role: string;
  dutyStatus: DutyStatus;
  countryScope: string;
  verificationsCompletedCount: number;
  lastActiveAt: string;
}

export const treasuryOperatorService = {
  async getRoster(): Promise<TreasuryOperatorProfile[]> {
    const res = await api.get('/admin/treasury-operators/roster');
    return res.data.data;
  },

  async setDutyStatus(dutyStatus: DutyStatus): Promise<TreasuryOperatorProfile> {
    const res = await api.post('/admin/treasury-operators/duty', { dutyStatus });
    return res.data.data;
  },

  async getQueue(): Promise<PaymentOrderRecord[]> {
    const res = await api.get('/admin/treasury-operators/queue');
    return res.data.data;
  },

  async verifyPaymentOrder(
    orderId: string,
    action: 'APPROVE' | 'REJECT',
    reason?: string,
  ): Promise<PaymentOrderRecord> {
    const res = await api.post(`/admin/treasury-operators/verify/${orderId}`, { action, reason });
    return res.data.data;
  },
};
