import type React from 'react';
import { Clock, ShoppingCart, Store, ArrowUpFromLine, ShieldAlert, Settings } from 'lucide-react';

type ActivityType = 'order' | 'operator' | 'withdrawal' | 'alert' | 'system';

interface ActivityItemProps {
  type: ActivityType;
  message: string;
  timestamp: string;
  severity?: 'info' | 'warning' | 'critical';
}

const typeIcons: Record<ActivityType, React.ReactNode> = {
  order: <ShoppingCart size={14} />,
  operator: <Store size={14} />,
  withdrawal: <ArrowUpFromLine size={14} />,
  alert: <ShieldAlert size={14} />,
  system: <Settings size={14} />,
};

const typeStyles: Record<ActivityType, string> = {
  order: 'bg-ton-blue/15 text-ton-blue',
  operator: 'bg-usdt-green/15 text-usdt-green',
  withdrawal: 'bg-gold/15 text-gold',
  alert: 'bg-error-red/15 text-error-red',
  system: 'bg-white/10 text-text-secondary',
};

const severityDot: Record<string, string> = {
  info: 'bg-ton-blue',
  warning: 'bg-gold',
  critical: 'bg-error-red',
};

export const ActivityItem: React.FC<ActivityItemProps> = ({ type, message, timestamp, severity }) => (
  <div className="flex items-start gap-3 py-2.5 group hover:bg-white/[0.02] rounded-lg px-2 -mx-2 transition-colors">
    <div className={`p-1.5 rounded-lg flex-shrink-0 ${typeStyles[type]}`}>{typeIcons[type]}</div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-text-primary truncate">{message}</p>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-xs text-text-tertiary">{timestamp}</span>
        {severity && (
          <span className={`w-1.5 h-1.5 rounded-full ${severityDot[severity]}`} />
        )}
      </div>
    </div>
  </div>
);
