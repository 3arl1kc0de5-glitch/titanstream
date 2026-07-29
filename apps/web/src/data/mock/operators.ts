export type OperatorStatus = 'active' | 'paused' | 'disabled' | 'offline';
export type OperatorAvailability = 'available' | 'busy' | 'offline';

export interface Operator {
  id: string;
  name: string;
  status: OperatorStatus;
  availability: OperatorAvailability;
  walletBalance: number;
  reserveBalance: number;
  pendingOrders: number;
  lifetimeVolume: number;
  successRate: number;
  averageCompletion: string;
  acceptanceRate: number;
  riskScore: number;
  currentWorkload: number;
  country: string;
  joinDate: string;
}

export const operators: Operator[] = [
  { id: 'OP-101', name: 'Nairobi Ops A', status: 'active', availability: 'available', walletBalance: 125000, reserveBalance: 50000, pendingOrders: 3, lifetimeVolume: 2450000, successRate: 98.5, averageCompletion: '1m 45s', acceptanceRate: 94.2, riskScore: 12, currentWorkload: 5, country: 'KE', joinDate: '2026-01-15' },
  { id: 'OP-102', name: 'Lagos Ops A', status: 'active', availability: 'busy', walletBalance: 89000, reserveBalance: 30000, pendingOrders: 7, lifetimeVolume: 1800000, successRate: 96.8, averageCompletion: '2m 12s', acceptanceRate: 91.5, riskScore: 25, currentWorkload: 12, country: 'NG', joinDate: '2026-02-20' },
  { id: 'OP-103', name: 'Cape Town Ops', status: 'paused', availability: 'offline', walletBalance: 45000, reserveBalance: 25000, pendingOrders: 0, lifetimeVolume: 920000, successRate: 94.1, averageCompletion: '3m 05s', acceptanceRate: 87.3, riskScore: 58, currentWorkload: 0, country: 'ZA', joinDate: '2026-03-10' },
  { id: 'OP-104', name: 'Accra Ops', status: 'active', availability: 'available', walletBalance: 210000, reserveBalance: 100000, pendingOrders: 2, lifetimeVolume: 3100000, successRate: 99.1, averageCompletion: '1m 20s', acceptanceRate: 97.8, riskScore: 8, currentWorkload: 4, country: 'GH', joinDate: '2026-01-05' },
  { id: 'OP-105', name: 'Mombasa Ops', status: 'disabled', availability: 'offline', walletBalance: 12000, reserveBalance: 5000, pendingOrders: 0, lifetimeVolume: 450000, successRate: 88.3, averageCompletion: '4m 30s', acceptanceRate: 76.1, riskScore: 82, currentWorkload: 0, country: 'KE', joinDate: '2026-04-01' },
];
