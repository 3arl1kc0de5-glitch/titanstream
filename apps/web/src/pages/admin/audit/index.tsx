import type React from 'react';
import { useState, useEffect } from 'react';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ChevronDown, Search } from 'lucide-react';
import { api } from '@/services/api';

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity: string;
  previousValue: string;
  newValue: string;
  severity: 'info' | 'warning' | 'critical';
  ip: string;
}

const severityVariant: Record<string, 'info' | 'warning' | 'danger'> = {
  info: 'info',
  warning: 'warning',
  critical: 'danger',
};

export const AuditPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/audit/logs')
      .then((res) => setAuditLogs(res.data?.data || []))
      .catch(() => setAuditLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? auditLogs.filter(e =>
        e.actor?.toLowerCase().includes(search.toLowerCase()) ||
        e.action?.toLowerCase().includes(search.toLowerCase()) ||
        e.entity?.toLowerCase().includes(search.toLowerCase())
      )
    : auditLogs;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actor, action, entity..."
            className="w-full bg-control-bg/50 text-text-primary rounded-lg pl-9 pr-3 py-2.5 sm:py-2 text-sm border border-white/5 focus:border-usdt-green focus:outline-none placeholder:text-text-tertiary"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center bg-card-bg rounded-xl border border-white/5 text-xs text-text-tertiary">
          Loading audit logs...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center bg-card-bg rounded-xl border border-white/5 space-y-1">
          <p className="text-xs font-bold text-text-primary">No audit log entries recorded yet</p>
          <p className="text-[11px] text-text-tertiary">System audit events and administrative actions will appear here.</p>
        </div>
      ) : (
        <div className="hidden sm:block bg-card-bg rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider px-4 py-3">Timestamp</th>
                  <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider px-4 py-3">Actor</th>
                  <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider px-4 py-3">Action</th>
                  <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider px-4 py-3">Entity</th>
                  <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider px-4 py-3">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-xs text-text-secondary font-mono whitespace-nowrap">{entry.timestamp}</td>
                    <td className="px-4 py-3 text-sm text-text-primary">{entry.actor}</td>
                    <td className="px-4 py-3 text-sm"><code className="text-xs bg-control-bg px-2 py-0.5 rounded text-ton-blue">{entry.action}</code></td>
                    <td className="px-4 py-3 text-sm text-text-primary">{entry.entity}</td>
                    <td className="px-4 py-3 text-xs">
                      <StatusBadge label={entry.severity} variant={severityVariant[entry.severity] || 'info'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
