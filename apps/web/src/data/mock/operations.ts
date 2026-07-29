import type { OrderStatus } from './orders';

export interface QueueItem {
  id: string;
  orderId: string;
  user: { name: string; username: string };
  merchant: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  assignedMerchant: string;
  age: string;
  waitTime: string;
  riskScore: number;
  priority: 'high' | 'medium' | 'low';
  country: string;
}

export const queueItems: QueueItem[] = [
  { id: 'q1', orderId: 'TS-8421', user: { name: 'Alex Johnson', username: '@alexj' }, merchant: 'CryptoKing', amount: 1240, currency: 'USDT', status: 'pending', assignedMerchant: 'FastPay LTD', age: '2m', waitTime: '1m 20s', riskScore: 12, priority: 'low', country: 'NG' },
  { id: 'q2', orderId: 'TS-8420', user: { name: 'Maria Santos', username: '@mariasantos' }, merchant: 'GoldExpress', amount: 3500, currency: 'USDT', status: 'active', assignedMerchant: 'SwiftPay', age: '10m', waitTime: '8m 30s', riskScore: 45, priority: 'medium', country: 'BR' },
  { id: 'q3', orderId: 'TS-8419', user: { name: 'Wei Chen', username: '@weichen' }, merchant: 'MoonTrading', amount: 8750, currency: 'USDT', status: 'pending', assignedMerchant: 'Unassigned', age: '20m', waitTime: '18m 45s', riskScore: 89, priority: 'high', country: 'CN' },
  { id: 'q4', orderId: 'TS-8418', user: { name: 'Olga Petrova', username: '@olgap' }, merchant: 'BitMart', amount: 680.50, currency: 'USDT', status: 'pending', assignedMerchant: 'MobiCash', age: '35m', waitTime: '33m', riskScore: 8, priority: 'low', country: 'RU' },
  { id: 'q5', orderId: 'TS-8416', user: { name: 'Sarah Kim', username: '@sarahkim' }, merchant: 'SeoulPay', amount: 15000, currency: 'USDT', status: 'disputed', assignedMerchant: 'CryptoBot Pro', age: '1h 25m', waitTime: '1h 20m', riskScore: 95, priority: 'high', country: 'KR' },
  { id: 'q6', orderId: 'TS-8415', user: { name: 'Carlos Mendez', username: '@carlosm' }, merchant: 'LATAM Crypto', amount: 450, currency: 'USDT', status: 'pending', assignedMerchant: 'Unassigned', age: '1h 40m', waitTime: '1h 35m', riskScore: 35, priority: 'medium', country: 'MX' },
  { id: 'q7', orderId: 'TS-8414', user: { name: 'Aisha Patel', username: '@aishap' }, merchant: 'IndiaCrypto', amount: 5000, currency: 'USDT', status: 'active', assignedMerchant: 'RapidTransfer', age: '1h 55m', waitTime: '1h 50m', riskScore: 28, priority: 'medium', country: 'IN' },
];
