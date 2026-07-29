export interface RiskCase {
  id: string;
  type: 'velocity' | 'duplicate_wallet' | 'duplicate_device' | 'large_tx' | 'referral_abuse' | 'operator_abuse' | 'geo_anomaly';
  severity: 'critical' | 'high' | 'medium' | 'low';
  entity: string;
  description: string;
  timestamp: string;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  riskScore: number;
}

export const riskCases: RiskCase[] = [
  { id: 'RC-001', type: 'velocity', severity: 'critical', entity: '@weichen', description: '15 transactions in 3 minutes — velocity threshold exceeded 5x', timestamp: '10m ago', status: 'open', riskScore: 95 },
  { id: 'RC-002', type: 'duplicate_wallet', severity: 'high', entity: '@mysteryuser', description: 'Wallet 0x742d...3b1a used by 3 different accounts', timestamp: '25m ago', status: 'open', riskScore: 85 },
  { id: 'RC-003', type: 'duplicate_device', severity: 'high', entity: '@weichen, @anotheruser', description: 'Same device ID used across 2 accounts', timestamp: '1h ago', status: 'reviewing', riskScore: 78 },
  { id: 'RC-004', type: 'large_tx', severity: 'medium', entity: '@sarahkim', description: 'Single withdrawal of $12,000 USDT — exceeds 95th percentile', timestamp: '2h ago', status: 'open', riskScore: 65 },
  { id: 'RC-005', type: 'referral_abuse', severity: 'medium', entity: '@referralking', description: '50+ self-referrals detected from same IP range', timestamp: '3h ago', status: 'reviewing', riskScore: 72 },
  { id: 'RC-006', type: 'operator_abuse', severity: 'critical', entity: 'MoonTrading (M-103)', description: 'Operator routing volume to own wallets — suspicious pattern', timestamp: '4h ago', status: 'open', riskScore: 92 },
  { id: 'RC-007', type: 'geo_anomaly', severity: 'low', entity: '@alexj', description: 'Login from US, transaction from Nigeria within 5 minutes', timestamp: '5h ago', status: 'dismissed', riskScore: 30 },
];
