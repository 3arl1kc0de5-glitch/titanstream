import type React from 'react';
import { motion } from 'framer-motion';

type HealthStatus = 'operational' | 'degraded' | 'down' | 'maintenance';

interface HealthWidgetProps {
  name: string;
  status: HealthStatus;
  uptime?: string;
  latency?: string;
  load?: number;
  className?: string;
}

const statusConfig: Record<HealthStatus, { color: string; label: string }> = {
  operational: { color: 'bg-usdt-green', label: 'Operational' },
  degraded: { color: 'bg-gold', label: 'Degraded' },
  down: { color: 'bg-error-red', label: 'Down' },
  maintenance: { color: 'bg-ton-blue', label: 'Maintenance' },
};

export const HealthWidget: React.FC<HealthWidgetProps> = ({ name, status, uptime, latency, load, className = '' }) => {
  const cfg = statusConfig[status];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-card-bg rounded-xl p-4 border border-border/50 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-text-primary">{name}</span>
        <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: status === 'operational' ? '#26a17b' : status === 'degraded' ? '#ffb300' : status === 'down' ? '#ff3b30' : '#0088cc' }}>
          <span className={`w-2 h-2 rounded-full ${cfg.color} ${status === 'operational' ? 'animate-pulse' : ''}`} />
          {cfg.label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        {uptime && (
          <div>
            <div className="text-xs text-text-tertiary">Uptime</div>
            <div className="text-sm font-bold text-text-primary">{uptime}</div>
          </div>
        )}
        {latency && (
          <div>
            <div className="text-xs text-text-tertiary">Latency</div>
            <div className="text-sm font-bold text-text-primary">{latency}</div>
          </div>
        )}
        {load !== undefined && (
          <div>
            <div className="text-xs text-text-tertiary">Load</div>
            <div className="text-sm font-bold text-text-primary">{load}%</div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
