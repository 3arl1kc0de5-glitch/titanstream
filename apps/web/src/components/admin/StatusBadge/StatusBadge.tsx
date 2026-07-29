import type React from 'react';

type StatusVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  default: 'bg-control-bg text-text-secondary',
  success: 'bg-usdt-green/15 text-usdt-green',
  warning: 'bg-gold/15 text-gold',
  danger: 'bg-error-red/15 text-error-red',
  info: 'bg-ton-blue/15 text-ton-blue',
  neutral: 'bg-white/5 text-text-tertiary',
};

const dotColors: Record<StatusVariant, string> = {
  default: 'bg-text-secondary',
  success: 'bg-usdt-green',
  warning: 'bg-gold',
  danger: 'bg-error-red',
  info: 'bg-ton-blue',
  neutral: 'bg-text-tertiary',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, variant = 'default', dot = false, className = '' }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${variantStyles[variant]} ${className}`}>
    {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
    {label}
  </span>
);
