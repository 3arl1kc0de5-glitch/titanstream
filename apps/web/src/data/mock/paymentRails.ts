export interface PaymentRail {
  id: string;
  name: string;
  health: 'operational' | 'degraded' | 'down';
  status: 'active' | 'maintenance' | 'inactive';
  successRate: number;
  latency: string;
  volume24h: number;
  failures24h: number;
}

export const paymentRails: PaymentRail[] = [
  { id: 'PR-01', name: 'Mobile Money', health: 'operational', status: 'active', successRate: 97.8, latency: '1.2s', volume24h: 1250000, failures24h: 28 },
  { id: 'PR-02', name: 'Bank Transfer', health: 'operational', status: 'active', successRate: 96.5, latency: '2.8s', volume24h: 980000, failures24h: 35 },
  { id: 'PR-03', name: 'CryptoBot', health: 'operational', status: 'active', successRate: 99.2, latency: '0.8s', volume24h: 2100000, failures24h: 17 },
  { id: 'PR-04', name: 'Card Processing', health: 'degraded', status: 'maintenance', successRate: 91.0, latency: '4.5s', volume24h: 420000, failures24h: 42 },
  { id: 'PR-05', name: 'PIX (Brazil)', health: 'operational', status: 'active', successRate: 98.4, latency: '0.5s', volume24h: 750000, failures24h: 12 },
];
