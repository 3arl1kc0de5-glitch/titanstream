export type OrderStatus = 'pending' | 'active' | 'completed' | 'failed' | 'refunded' | 'disputed';
export type PaymentMethod = 'mobile_money' | 'bank' | 'crypto_bot' | 'card';

export interface Order {
  id: string;
  orderId: string;
  user: { name: string; telegramId: string; username: string };
  operator: { name: string; id: string };
  paymentMethod: PaymentMethod;
  amount: number;
  currency: string;
  status: OrderStatus;
  assignedOperator: string;
  createdAt: string;
  age: string;
  riskScore: number;
  country: string;
}

export const orders: Order[] = [
  { id: '1', orderId: 'TS-8421', user: { name: 'Alex Johnson', telegramId: '12345678', username: '@alexj' }, operator: { name: 'CryptoKing', id: 'M-101' }, paymentMethod: 'mobile_money', amount: 1240.00, currency: 'USDT', status: 'completed', assignedOperator: 'FastPay LTD', createdAt: '2026-07-28T10:23:00Z', age: '2m', riskScore: 12, country: 'NG' },
  { id: '2', orderId: 'TS-8420', user: { name: 'Maria Santos', telegramId: '23456789', username: '@mariasantos' }, operator: { name: 'GoldExpress', id: 'M-102' }, paymentMethod: 'bank', amount: 3500.00, currency: 'USDT', status: 'active', assignedOperator: 'SwiftPay', createdAt: '2026-07-28T10:15:00Z', age: '10m', riskScore: 45, country: 'BR' },
  { id: '3', orderId: 'TS-8419', user: { name: 'Wei Chen', telegramId: '34567890', username: '@weichen' }, operator: { name: 'MoonTrading', id: 'M-103' }, paymentMethod: 'crypto_bot', amount: 8750.00, currency: 'USDT', status: 'pending', assignedOperator: 'Unassigned', createdAt: '2026-07-28T10:05:00Z', age: '20m', riskScore: 89, country: 'CN' },
  { id: '4', orderId: 'TS-8418', user: { name: 'Olga Petrova', telegramId: '45678901', username: '@olgap' }, operator: { name: 'BitMart', id: 'M-104' }, paymentMethod: 'mobile_money', amount: 680.50, currency: 'USDT', status: 'completed', assignedOperator: 'MobiCash', createdAt: '2026-07-28T09:50:00Z', age: '35m', riskScore: 8, country: 'RU' },
  { id: '5', orderId: 'TS-8417', user: { name: 'James Okafor', telegramId: '56789012', username: '@jamesok' }, operator: { name: 'AfriTrade', id: 'M-105' }, paymentMethod: 'bank', amount: 2200.00, currency: 'USDT', status: 'failed', assignedOperator: 'BankLink', createdAt: '2026-07-28T09:30:00Z', age: '55m', riskScore: 72, country: 'GH' },
  { id: '6', orderId: 'TS-8416', user: { name: 'Sarah Kim', telegramId: '67890123', username: '@sarahkim' }, operator: { name: 'SeoulPay', id: 'M-106' }, paymentMethod: 'crypto_bot', amount: 15000.00, currency: 'USDT', status: 'disputed', assignedOperator: 'CryptoBot Pro', createdAt: '2026-07-28T09:00:00Z', age: '1h 25m', riskScore: 95, country: 'KR' },
  { id: '7', orderId: 'TS-8415', user: { name: 'Carlos Mendez', telegramId: '78901234', username: '@carlosm' }, operator: { name: 'LATAM Crypto', id: 'M-107' }, paymentMethod: 'mobile_money', amount: 450.00, currency: 'USDT', status: 'pending', assignedOperator: 'Unassigned', createdAt: '2026-07-28T08:45:00Z', age: '1h 40m', riskScore: 35, country: 'MX' },
  { id: '8', orderId: 'TS-8414', user: { name: 'Aisha Patel', telegramId: '89012345', username: '@aishap' }, operator: { name: 'IndiaCrypto', id: 'M-108' }, paymentMethod: 'bank', amount: 5000.00, currency: 'USDT', status: 'active', assignedOperator: 'RapidTransfer', createdAt: '2026-07-28T08:30:00Z', age: '1h 55m', riskScore: 28, country: 'IN' },
  { id: '9', orderId: 'TS-8413', user: { name: 'Tom Wilson', telegramId: '90123456', username: '@tomw' }, operator: { name: 'USDCash', id: 'M-109' }, paymentMethod: 'crypto_bot', amount: 3200.00, currency: 'USDT', status: 'refunded', assignedOperator: 'CryptoBot Pro', createdAt: '2026-07-28T08:00:00Z', age: '2h 25m', riskScore: 60, country: 'US' },
  { id: '10', orderId: 'TS-8412', user: { name: 'Linh Nguyen', telegramId: '01234567', username: '@linhn' }, operator: { name: 'SaiGon Crypto', id: 'M-110' }, paymentMethod: 'mobile_money', amount: 890.00, currency: 'USDT', status: 'completed', assignedOperator: 'MobiCash', createdAt: '2026-07-28T07:45:00Z', age: '2h 40m', riskScore: 15, country: 'VN' },
];
