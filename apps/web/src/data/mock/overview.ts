export interface KpiData {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: string;
  variant: 'green' | 'red' | 'blue' | 'gold' | 'default';
}

export interface ActivityEvent {
  id: string;
  type: 'order' | 'operator' | 'withdrawal' | 'alert' | 'system';
  message: string;
  timestamp: string;
  severity?: 'info' | 'warning' | 'critical';
}

export const kpiCards: KpiData[] = [
  { label: 'Daily Volume', value: '$1,284,530', change: 12.5, changeLabel: 'vs yesterday', icon: 'DollarSign', variant: 'green' },
  { label: 'Pending Orders', value: '47', change: -8.3, changeLabel: 'vs yesterday', icon: 'Clock', variant: 'gold' },
  { label: 'Completed Orders', value: '1,892', change: 5.2, changeLabel: 'vs yesterday', icon: 'CheckCircle', variant: 'green' },
  { label: 'Operator Availability', value: '96.8%', change: 1.1, changeLabel: 'vs yesterday', icon: 'Store', variant: 'green' },
  { label: 'Liquidity', value: '$8.2M', change: -2.4, changeLabel: 'vs yesterday', icon: 'Droplets', variant: 'red' },
  { label: 'Crypto Reserve', value: '1,450 BTC', change: 0.8, changeLabel: 'vs yesterday', icon: 'Bitcoin', variant: 'blue' },
  { label: 'Avg Fulfillment', value: '2m 34s', change: -15.2, changeLabel: 'improved', icon: 'Timer', variant: 'green' },
  { label: 'Failed Orders', value: '12', change: 3.1, changeLabel: 'vs yesterday', icon: 'XCircle', variant: 'red' },
  { label: 'Risk Alerts', value: '3', change: 0, changeLabel: 'unchanged', icon: 'ShieldAlert', variant: 'gold' },
];

export const recentActivity: ActivityEvent[] = [
  { id: '1', type: 'order', message: 'Order #TS-8421 completed — $1,240.00', timestamp: '2m ago', severity: 'info' },
  { id: '2', type: 'operator', message: 'Operator "CryptoKing" went offline', timestamp: '5m ago', severity: 'warning' },
  { id: '3', type: 'withdrawal', message: 'Large withdrawal #WD-331 — 12.5 BTC broadcasted', timestamp: '8m ago', severity: 'info' },
  { id: '4', type: 'alert', message: 'Low reserve warning: USDT wallet #3', timestamp: '12m ago', severity: 'critical' },
  { id: '5', type: 'system', message: 'Webhook processor queue backlog cleared', timestamp: '15m ago', severity: 'info' },
  { id: '6', type: 'order', message: 'Order #TS-8419 flagged — risk score 89%', timestamp: '18m ago', severity: 'warning' },
  { id: '7', type: 'operator', message: 'New operator "GoldExpress" onboarded', timestamp: '22m ago', severity: 'info' },
  { id: '8', type: 'withdrawal', message: 'Withdrawal #WD-329 confirmed on-chain', timestamp: '25m ago', severity: 'info' },
];
