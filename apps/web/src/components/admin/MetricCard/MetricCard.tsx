import type React from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon?: keyof typeof Icons;
  variant?: 'default' | 'green' | 'red' | 'blue' | 'gold';
  className?: string;
}

const variantAccents: Record<string, string> = {
  green: 'border-l-2 border-l-usdt-green',
  red: 'border-l-2 border-l-error-red',
  blue: 'border-l-2 border-l-ton-blue',
  gold: 'border-l-2 border-l-gold',
  default: 'border-l-2 border-l-border',
};

const iconVariants: Record<string, string> = {
  green: 'text-usdt-green bg-usdt-green/10',
  red: 'text-error-red bg-error-red/10',
  blue: 'text-ton-blue bg-ton-blue/10',
  gold: 'text-gold bg-gold/10',
  default: 'text-text-secondary bg-control-bg',
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label, value, change, changeLabel, icon, variant = 'default', className = '',
}) => {
  const IconComponent = icon ? Icons[icon] as React.ElementType : null;
  const isPositive = change !== undefined && change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card-bg rounded-xl p-4 ${variantAccents[variant]} ${className}`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{label}</span>
        {IconComponent && (
          <div className={`p-2 rounded-lg ${iconVariants[variant]}`}>
            <IconComponent size={16} />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-text-primary mb-1">{value}</div>
      {change !== undefined && (
        <div className="flex items-center gap-1.5">
          <span className={`text-xs font-semibold ${isPositive ? 'text-usdt-green' : 'text-error-red'}`}>
            {isPositive ? '+' : ''}{(Number(change) || 0).toFixed(1)}%
          </span>
          {changeLabel && <span className="text-xs text-text-tertiary">{changeLabel}</span>}
        </div>
      )}
    </motion.div>
  );
};
