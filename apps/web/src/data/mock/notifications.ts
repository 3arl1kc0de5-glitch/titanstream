export interface NotificationItem {
  id: string;
  type: 'order' | 'operator' | 'system' | 'alert' | 'withdrawal';
  title: string;
  message: string;
  channel: 'telegram' | 'email' | 'internal' | 'webhook';
  status: 'sent' | 'pending' | 'failed' | 'delivered';
  createdAt: string;
  read: boolean;
}

export const notifications: NotificationItem[] = [
  { id: 'N-001', type: 'order', title: 'Order Completed', message: 'Order #TS-8421 completed successfully', channel: 'telegram', status: 'delivered', createdAt: '2m ago', read: false },
  { id: 'N-002', type: 'operator', title: 'Operator Offline', message: 'CryptoKing went offline', channel: 'internal', status: 'sent', createdAt: '5m ago', read: false },
  { id: 'N-003', type: 'alert', title: 'Low Reserve Warning', message: 'USDT Wallet #3 below 10%', channel: 'email', status: 'delivered', createdAt: '12m ago', read: false },
  { id: 'N-004', type: 'withdrawal', title: 'Large Withdrawal', message: 'WD-331 — 12.5 BTC broadcasted', channel: 'telegram', status: 'delivered', createdAt: '8m ago', read: true },
  { id: 'N-005', type: 'system', title: 'Queue Cleared', message: 'Webhook processor backlog resolved', channel: 'internal', status: 'sent', createdAt: '15m ago', read: true },
  { id: 'N-006', type: 'order', title: 'Order Flagged', message: 'TS-8419 flagged — risk score 89%', channel: 'email', status: 'failed', createdAt: '18m ago', read: false },
];
