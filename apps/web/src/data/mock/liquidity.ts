export interface LiquidityMetric {
  label: string;
  value: string;
  change: number;
  variant: 'green' | 'red' | 'blue' | 'gold';
}

export interface LiquidityChartPoint {
  time: string;
  internal: number;
  operator: number;
  reserved: number;
}

export interface AlertItem {
  id: string;
  type: 'low_reserve' | 'operator_depletion' | 'exposure_warning' | 'imbalance';
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
}

export const liquidityMetrics: LiquidityMetric[] = [
  { label: 'Internal Liquidity', value: '$4.2M', change: 2.1, variant: 'green' },
  { label: 'Operator Liquidity', value: '$2.8M', change: -1.5, variant: 'red' },
  { label: 'Reserved Funds', value: '$1.1M', change: 0.3, variant: 'blue' },
  { label: 'Pending Exposure', value: '$850K', change: 5.7, variant: 'gold' },
  { label: 'Available Liquidity', value: '$3.4M', change: 1.8, variant: 'green' },
  { label: 'Crypto Treasury', value: '$6.7M', change: -0.9, variant: 'red' },
];

export const liquidityChartData: LiquidityChartPoint[] = [
  { time: '00:00', internal: 4.0, operator: 2.5, reserved: 1.0 },
  { time: '04:00', internal: 3.8, operator: 2.3, reserved: 1.1 },
  { time: '08:00', internal: 4.2, operator: 2.8, reserved: 1.0 },
  { time: '12:00', internal: 4.5, operator: 3.0, reserved: 0.9 },
  { time: '16:00', internal: 4.1, operator: 2.6, reserved: 1.2 },
  { time: '20:00', internal: 4.2, operator: 2.8, reserved: 1.1 },
];

export const liquidityAlerts: AlertItem[] = [
  { id: 'LA-1', type: 'low_reserve', message: 'USDT Wallet #3 reserve below 10% threshold', severity: 'high', timestamp: '12m ago' },
  { id: 'LA-2', type: 'operator_depletion', message: 'Operator "MoonTrading" wallet depleted', severity: 'medium', timestamp: '1h 20m ago' },
  { id: 'LA-3', type: 'exposure_warning', message: 'Pending exposure exceeds 25% of available liquidity', severity: 'high', timestamp: '2h 05m ago' },
  { id: 'LA-4', type: 'imbalance', message: 'Internal/Operator liquidity ratio at 1.5:1', severity: 'low', timestamp: '3h 30m ago' },
];
