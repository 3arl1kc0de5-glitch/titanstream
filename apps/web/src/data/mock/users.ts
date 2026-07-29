export interface UserProfile {
  id: string;
  name: string;
  telegramId: string;
  username: string;
  joinDate: string;
  totalVolume: number;
  totalDeposits: number;
  totalWithdrawals: number;
  countries: string[];
  wallets: string[];
  linkedOperators: string[];
  riskScore: number;
  flags: string[];
  notes: string[];
}

export const userProfiles: UserProfile[] = [
  {
    id: 'U-001', name: 'Alex Johnson', telegramId: '12345678', username: '@alexj',
    joinDate: '2026-03-15', totalVolume: 45000, totalDeposits: 52000, totalWithdrawals: 38000,
    countries: ['US', 'UK'], wallets: ['0x742d...3b1a', '0x8f3E...d8E'],
    linkedOperators: ['CryptoKing', 'BitMart'], riskScore: 12, flags: [], notes: ['Premium user', 'Verified KYC Level 3'],
  },
  {
    id: 'U-002', name: 'Wei Chen', telegramId: '34567890', username: '@weichen',
    joinDate: '2026-05-01', totalVolume: 125000, totalDeposits: 150000, totalWithdrawals: 98000,
    countries: ['CN', 'SG', 'HK'], wallets: ['bnb1a8...f5a6', '0x9a8b...a0b', '0x742d...3b1a'],
    linkedOperators: ['MoonTrading', 'CryptoKing'], riskScore: 72, flags: ['Multiple accounts', 'High velocity'],
    notes: ['Flagged for review — duplicate device detected'],
  },
  {
    id: 'U-003', name: 'Sarah Kim', telegramId: '67890123', username: '@sarahkim',
    joinDate: '2026-04-10', totalVolume: 89000, totalDeposits: 95000, totalWithdrawals: 82000,
    countries: ['KR', 'JP'], wallets: ['EQD4f5...y3u'],
    linkedOperators: ['SeoulPay'], riskScore: 65, flags: ['Large withdrawals', 'Geographic anomaly'],
    notes: ['Withdrawal pattern unusual — further investigation required'],
  },
];
