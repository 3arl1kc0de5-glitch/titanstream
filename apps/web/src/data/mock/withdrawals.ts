export type WithdrawalStatus = 'requested' | 'queued' | 'broadcasting' | 'confirming' | 'completed' | 'failed';

export interface Withdrawal {
  id: string;
  withdrawalId: string;
  user: { name: string; telegramId: string };
  destination: string;
  network: string;
  amount: number;
  currency: string;
  fee: number;
  status: WithdrawalStatus;
  riskScore: number;
  createdAt: string;
  completedAt?: string;
}

export const withdrawals: Withdrawal[] = [
  { id: 'W-001', withdrawalId: 'WD-331', user: { name: 'Alex Johnson', telegramId: '12345678' }, destination: '0x742d...3b1a', network: 'TRC-20', amount: 12.5, currency: 'BTC', fee: 0.0005, status: 'broadcasting', riskScore: 15, createdAt: '2026-07-28T10:20:00Z' },
  { id: 'W-002', withdrawalId: 'WD-330', user: { name: 'Maria Santos', telegramId: '23456789' }, destination: '0x8f3E...d8E', network: 'ERC-20', amount: 8500, currency: 'USDT', fee: 12.50, status: 'queued', riskScore: 42, createdAt: '2026-07-28T10:10:00Z' },
  { id: 'W-003', withdrawalId: 'WD-329', user: { name: 'Wei Chen', telegramId: '34567890' }, destination: 'bnb1a8...f5a6', network: 'BEP-20', amount: 3200, currency: 'USDT', fee: 4.80, status: 'completed', riskScore: 72, createdAt: '2026-07-28T09:55:00Z', completedAt: '2026-07-28T10:02:00Z' },
  { id: 'W-004', withdrawalId: 'WD-328', user: { name: 'Olga Petrova', telegramId: '45678901' }, destination: 'EQD4f5...y3u', network: 'TON', amount: 1500, currency: 'TON', fee: 0.1, status: 'confirming', riskScore: 28, createdAt: '2026-07-28T09:40:00Z' },
  { id: 'W-005', withdrawalId: 'WD-327', user: { name: 'James Okafor', telegramId: '56789012' }, destination: '0x9a8b...a0b', network: 'TRC-20', amount: 5000, currency: 'USDT', fee: 7.50, status: 'failed', riskScore: 88, createdAt: '2026-07-28T09:15:00Z' },
  { id: 'W-006', withdrawalId: 'WD-326', user: { name: 'Sarah Kim', telegramId: '67890123' }, destination: '0x742d...3b1a', network: 'TRC-20', amount: 12000, currency: 'USDT', fee: 18.00, status: 'requested', riskScore: 65, createdAt: '2026-07-28T08:50:00Z' },
];
