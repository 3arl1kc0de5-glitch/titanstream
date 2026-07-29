import { api } from './api';

export interface MissionControlData {
  system_health: {
    status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    database: 'UP' | 'DOWN';
    api: 'UP' | 'DOWN';
    treasury_reserve: 'HEALTHY' | 'WATCH' | 'CRITICAL';
    worker_queue: 'HEALTHY' | 'DEGRADED';
  };
  operational_queues: {
    payment_orders_pending: number;
    payment_orders_verification: number;
    operations_queue_open: number;
    risk_events_open: number;
    active_incidents: number;
    support_cases_open: number;
  };
  financial_summary: {
    total_liquidity_usdt: number;
    user_liabilities_usdt: number;
    reserve_ratio_percent: number;
    projected_payouts_usdt: number;
  };
  capacity_summary: {
    total_capacity_ghs: number;
    active_nodes: number;
    capacity_utilization_percent: number;
  };
  active_incidents: any[];
  recent_audit_trail: any[];
}

export interface OperationsQueueRecord {
  id: string;
  settlementId?: string;
  reason: string;
  status: 'OPEN' | 'RESOLVED' | 'ESCALATED';
  payload: any;
  createdAt: string;
  resolvedAt?: string;
}

export interface SystemIncidentRecord {
  id: string;
  reference: string;
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED';
  affectedComponent: string;
  ownerName?: string;
  timeline: Array<{ timestamp: string; message: string; author: string }>;
  createdAt: string;
  resolvedAt?: string;
}

export interface OperationalSearchResult {
  category: string;
  id: string;
  title: string;
  subtitle: string;
  status: string;
  timestamp: string;
  link: string;
}

export const operationsService = {
  async getMissionControlOverview(): Promise<MissionControlData> {
    const res = await api.get('/admin/operations/mission-control');
    return res.data.data;
  },

  async getOperationsQueue(): Promise<OperationsQueueRecord[]> {
    const res = await api.get('/admin/operations/queue');
    return res.data.data;
  },

  async resolveQueueItem(id: string, note?: string): Promise<OperationsQueueRecord> {
    const res = await api.post(`/admin/operations/queue/${id}/resolve`, { note });
    return res.data.data;
  },

  async retryQueueItem(id: string): Promise<OperationsQueueRecord> {
    const res = await api.post(`/admin/operations/queue/${id}/retry`);
    return res.data.data;
  },

  async getIncidents(): Promise<SystemIncidentRecord[]> {
    const res = await api.get('/admin/operations/incidents');
    return res.data.data;
  },

  async createIncident(payload: {
    title: string;
    description: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    affectedComponent: string;
    ownerName?: string;
  }): Promise<SystemIncidentRecord> {
    const res = await api.post('/admin/operations/incidents', payload);
    return res.data.data;
  },

  async assignIncidentOwner(id: string, ownerName: string): Promise<SystemIncidentRecord> {
    const res = await api.post(`/admin/operations/incidents/${id}/assign`, { ownerName });
    return res.data.data;
  },

  async resolveIncident(id: string, note?: string): Promise<SystemIncidentRecord> {
    const res = await api.post(`/admin/operations/incidents/${id}/resolve`, { note });
    return res.data.data;
  },

  async search(query: string): Promise<OperationalSearchResult[]> {
    const res = await api.get('/admin/operations/search', { params: { q: query } });
    return res.data.data;
  },
};
