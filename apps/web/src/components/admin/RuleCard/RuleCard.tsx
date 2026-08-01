import type React from 'react';
import { Zap, Play, Pause, Copy, Eye } from 'lucide-react';
import { StatusBadge } from '@/components/admin/StatusBadge';

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  status: 'enabled' | 'disabled' | 'error';
  executionCount: number;
  successRate: number;
  lastExecution: string;
}

interface RuleCardProps {
  rule: AutomationRule;
  className?: string;
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  enabled: 'success',
  disabled: 'warning',
  error: 'danger',
};

const actions = [
  { icon: <Play size={14} />, label: 'Enable' },
  { icon: <Pause size={14} />, label: 'Disable' },
  { icon: <Copy size={14} />, label: 'Duplicate' },
  { icon: <Eye size={14} />, label: 'View Logs' },
];

export const RuleCard: React.FC<RuleCardProps> = ({ rule, className = '' }) => (
  <div className={`bg-card-bg rounded-xl p-4 border border-border/50 ${className}`}>
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-gold/15 text-gold">
          <Zap size={16} />
        </div>
        <div>
          <span className="text-sm font-bold text-text-primary">{rule.name}</span>
          <span className="text-xs text-text-tertiary block">{rule.description}</span>
        </div>
      </div>
      <StatusBadge label={rule.status} variant={statusVariant[rule.status]} dot />
    </div>
    <div className="space-y-1.5 mb-3">
      <div className="text-xs"><span className="text-text-tertiary">Trigger:</span> <code className="text-usdt-green font-mono">{rule.trigger}</code></div>
      <div className="text-xs"><span className="text-text-tertiary">Executions:</span> <span className="text-text-primary font-semibold">{(Number(rule?.executionCount) || 0).toLocaleString()}</span></div>
      <div className="text-xs"><span className="text-text-tertiary">Success Rate:</span> <span className="text-text-primary font-semibold">{rule.successRate}%</span></div>
      <div className="text-xs"><span className="text-text-tertiary">Last Exec:</span> <span className="text-text-primary">{rule.lastExecution}</span></div>
    </div>
    <div className="flex gap-2 pt-3 border-t border-border">
      {actions.map((action) => (
        <button
          key={action.label}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-control-bg hover:bg-white/10 transition-colors text-xs text-text-secondary hover:text-text-primary"
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </div>
  </div>
);
