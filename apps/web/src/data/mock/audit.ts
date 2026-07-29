export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity: string;
  previousValue: string;
  newValue: string;
  ip: string;
  session: string;
  severity: 'info' | 'warning' | 'critical';
}

export const auditEntries: AuditEntry[] = [
  { id: 'A-001', timestamp: '2026-07-28 10:23:15', actor: 'admin@tetherstream.io', action: 'operator.pause', entity: 'Operator MoonTrading', previousValue: 'active', newValue: 'paused', ip: '192.168.1.100', session: 'S-ABC123', severity: 'warning' },
  { id: 'A-002', timestamp: '2026-07-28 10:15:00', actor: 'system', action: 'order.complete', entity: 'Order TS-8421', previousValue: 'pending', newValue: 'completed', ip: 'system', session: 'system', severity: 'info' },
  { id: 'A-003', timestamp: '2026-07-28 10:00:00', actor: 'ops@tetherstream.io', action: 'withdrawal.approve', entity: 'Withdrawal WD-330', previousValue: 'queued', newValue: 'approved', ip: '10.0.0.45', session: 'S-DEF456', severity: 'info' },
  { id: 'A-004', timestamp: '2026-07-28 09:45:30', actor: 'system', action: 'alert.trigger', entity: 'Low Reserve Alert', previousValue: 'none', newValue: 'critical', ip: 'system', session: 'system', severity: 'critical' },
  { id: 'A-005', timestamp: '2026-07-28 09:30:00', actor: 'risk@tetherstream.io', action: 'user.flag', entity: 'User @weichen', previousValue: 'clean', newValue: 'flagged', ip: '10.0.0.100', session: 'S-GHI789', severity: 'warning' },
  { id: 'A-006', timestamp: '2026-07-28 09:15:00', actor: 'admin@tetherstream.io', action: 'settings.update', entity: 'Fee Schedule', previousValue: '1.5%', newValue: '2.0%', ip: '192.168.1.100', session: 'S-ABC123', severity: 'info' },
];
