import type React from 'react';
import { useState } from 'react';
import { auditEntries } from '@/data/mock/audit';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ChevronDown, Search } from 'lucide-react';

const severityVariant: Record<string, 'info' | 'warning' | 'danger'> = {
  info: 'info',
  warning: 'warning',
  critical: 'danger',
};

export const AuditPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = search
    ? auditEntries.filter(e =>
        e.actor.toLowerCase().includes(search.toLowerCase()) ||
        e.action.toLowerCase().includes(search.toLowerCase()) ||
        e.entity.toLowerCase().includes(search.toLowerCase())
      )
    : auditEntries;

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
        <select className="bg-control-bg/50 text-text-primary rounded-lg px-3 py-2.5 sm:py-2 border border-white/5 focus:border-usdt-green focus:outline-none text-sm min-h-[40px]">
          <option>All Severities</option>
          <option>Critical</option>
          <option>Warning</option>
          <option>Info</option>
        </select>
        <button className="px-4 py-2.5 sm:py-2 rounded-lg bg-control-bg hover:bg-white/10 transition-colors text-sm text-text-secondary min-h-[40px]">
          Export
        </button>
      </div>

      {/* Mobile: card view */}
      <div className="sm:hidden space-y-2">
        {filtered.map((entry) => (
          <div key={entry.id} className="bg-card-bg rounded-xl border border-border/50">
            <div
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              className="p-3 cursor-pointer active:bg-white/[0.02]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge label={entry.severity} variant={severityVariant[entry.severity]} dot />
                  <code className="text-xs bg-control-bg px-2 py-0.5 rounded text-ton-blue">{entry.action}</code>
                </div>
                <ChevronDown size={14} className={`text-text-tertiary transition-transform ${expandedId === entry.id ? 'rotate-180' : ''}`} />
              </div>
              <p className="text-sm text-text-primary mt-2"><span className="text-text-tertiary">Actor:</span> {entry.actor}</p>
              <p className="text-xs text-text-tertiary mt-1">{entry.timestamp}</p>
              {expandedId === entry.id && (
                <div className="mt-3 pt-3 border-t border-border space-y-2 text-xs">
                  <div><span className="text-text-tertiary">Entity:</span> <span className="text-text-primary">{entry.entity}</span></div>
                  <div><span className="text-text-tertiary">Previous:</span> <span className="text-text-primary font-mono">{entry.previousValue}</span></div>
                  <div><span className="text-text-tertiary">New:</span> <span className="text-text-primary font-mono">{entry.newValue}</span></div>
                  <div><span className="text-text-tertiary">IP:</span> <span className="text-text-primary font-mono">{entry.ip}</span></div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table view */}
      <div className="hidden sm:block bg-card-bg rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider px-4 py-3">Timestamp</th>
                <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider px-4 py-3">Actor</th>
                <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider px-4 py-3">Action</th>
                <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider px-4 py-3">Entity</th>
                <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider px-4 py-3">Previous</th>
                <th className="text-left text-xs font-semibold text-text-secondary uppercase tracking-wider px-4 py-3">New</th>
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
                  <td className="px-4 py-3 text-xs text-text-tertiary font-mono max-w-[120px] truncate">{entry.previousValue}</td>
                  <td className="px-4 py-3 text-xs text-text-primary font-mono max-w-[120px] truncate">{entry.newValue}</td>
                  <td className="px-4 py-3"><StatusBadge label={entry.severity} variant={severityVariant[entry.severity]} dot /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
