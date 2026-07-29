export type WalletHealth = 'healthy' | 'warning' | 'critical';

export interface Wallet {
  id: string;
  network: string;
  address: string;
  balance: number;
  reserved: number;
  pending: number;
  available: number;
  incoming: number;
  outgoing: number;
  health: WalletHealth;
  lastSync: string;
  recentTransactions: number;
}

export const wallets: Wallet[] = [
  { id: 'W-001', network: 'TRC-20', address: '0x742d35Cc6634C0532925a3b844Bc4a1b3b9b3b1a', balance: 2500000, reserved: 800000, pending: 150000, available: 1550000, incoming: 320000, outgoing: 180000, health: 'healthy', lastSync: '30s ago', recentTransactions: 145 },
  { id: 'W-002', network: 'ERC-20', address: '0x8f3E8A8e8b8C8d8E8f8A8b8C8d8E8f8A8b8C8d8E', balance: 1800000, reserved: 600000, pending: 200000, available: 1000000, incoming: 150000, outgoing: 280000, health: 'warning', lastSync: '2m ago', recentTransactions: 98 },
  { id: 'W-003', network: 'BEP-20', address: 'bnb1a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6', balance: 950000, reserved: 300000, pending: 75000, available: 575000, incoming: 85000, outgoing: 120000, health: 'healthy', lastSync: '1m ago', recentTransactions: 67 },
  { id: 'W-004', network: 'TON', address: 'EQD4f5g6h7j8k9l0z1x2c3v4b5n6m7q8w9e0r1t2y3u', balance: 420000, reserved: 150000, pending: 50000, available: 220000, incoming: 45000, outgoing: 60000, health: 'critical', lastSync: '15m ago', recentTransactions: 34 },
  { id: 'W-005', network: 'TRC-20', address: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b', balance: 3100000, reserved: 1000000, pending: 250000, available: 1850000, incoming: 410000, outgoing: 350000, health: 'healthy', lastSync: '45s ago', recentTransactions: 210 },
];
