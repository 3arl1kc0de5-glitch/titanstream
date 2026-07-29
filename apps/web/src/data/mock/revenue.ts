export interface RevenueMetric {
  label: string;
  value: string;
  change: number;
  variant: 'green' | 'red' | 'blue' | 'gold';
}

export interface RevenueSource {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export const revenueMetrics: RevenueMetric[] = [
  { label: 'Daily Revenue', value: '$24,580', change: 8.3, variant: 'green' },
  { label: 'Weekly Revenue', value: '$168,200', change: 5.1, variant: 'green' },
  { label: 'Monthly Revenue', value: '$712,450', change: -2.4, variant: 'red' },
  { label: 'Lifetime Revenue', value: '$8,245,000', change: 12.8, variant: 'green' },
];

export const revenueSources: RevenueSource[] = [
  { name: 'Spread', value: 324000, percentage: 39.3, color: '#26a17b' },
  { name: 'Withdrawal Fees', value: 198000, percentage: 24.0, color: '#0088cc' },
  { name: 'Operator Fees', value: 165000, percentage: 20.0, color: '#ffb300' },
  { name: 'FX', value: 89000, percentage: 10.8, color: '#29b6f6' },
  { name: 'Premium Services', value: 49000, percentage: 5.9, color: '#ff3b30' },
];
