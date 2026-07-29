import { api } from './api';

export type PaymentOrderType = 'DEPOSIT' | 'WITHDRAWAL' | 'MACHINE_PURCHASE' | 'REFUND' | 'ADJUSTMENT';
export type PaymentOrderStatus = 
  | 'CREATED' 
  | 'AWAITING_PAYMENT' 
  | 'AWAITING_VERIFICATION' 
  | 'APPROVED' 
  | 'POSTING_TO_LEDGER' 
  | 'COMPLETED' 
  | 'REJECTED' 
  | 'EXPIRED' 
  | 'CANCELLED';

export interface PaymentDestinationConfig {
  id: string;
  network: string;
  country: string;
  currency: string;
  receivingNumber: string;
  receivingName: string;
  ussdTemplate: string;
  exchangeRateUsdt: number;
  minAmountUsdt: number;
  maxAmountUsdt: number;
  isActive: boolean;
}

export interface CreatePaymentOrderPayload {
  type: PaymentOrderType;
  amount: number;
  currency?: string;
  paymentMethod?: 'MOBILE_MONEY' | 'CRYPTOBOT';
  network?: string;
  country?: string;
  mobileNumber?: string;
  metadata?: Record<string, any>;
}

export interface PaymentOrderRecord {
  id: string;
  reference: string;
  telegramUserId: string;
  type: PaymentOrderType;
  amount: number;
  localAmount: number;
  currency: string;
  asset: string;
  paymentMethod: string;
  network: string;
  country: string;
  status: PaymentOrderStatus;
  receivingNumber: string;
  receivingName: string;
  ussdCode: string;
  telUri: string;
  mobileNumber?: string;
  metadata?: Record<string, any>;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export const paymentOrderService = {
  async getDestinations(): Promise<PaymentDestinationConfig[]> {
    const res = await api.get('/payment-orders/destinations');
    return res.data.data;
  },

  async createOrder(payload: CreatePaymentOrderPayload): Promise<PaymentOrderRecord> {
    const res = await api.post('/payment-orders', payload);
    return res.data.data;
  },

  async getMyOrders(): Promise<PaymentOrderRecord[]> {
    const res = await api.get('/payment-orders/my');
    return res.data.data;
  },

  async getOrder(id: string): Promise<PaymentOrderRecord> {
    const res = await api.get(`/payment-orders/${id}`);
    return res.data.data;
  },

  async submitForVerification(id: string): Promise<PaymentOrderRecord> {
    const res = await api.post(`/payment-orders/${id}/verify`);
    return res.data.data;
  },

  // Admin APIs
  async adminListOrders(): Promise<PaymentOrderRecord[]> {
    const res = await api.get('/payment-orders/admin/list');
    return res.data.data;
  },

  async adminApproveOrder(id: string): Promise<PaymentOrderRecord> {
    const res = await api.post(`/payment-orders/admin/${id}/approve`);
    return res.data.data;
  },

  async adminRejectOrder(id: string, reason: string): Promise<PaymentOrderRecord> {
    const res = await api.post(`/payment-orders/admin/${id}/reject`, { reason });
    return res.data.data;
  },
};
