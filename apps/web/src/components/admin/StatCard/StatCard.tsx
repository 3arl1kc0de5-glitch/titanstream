import type React from 'react';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  variant?: 'default' | 'gold' | 'success';
  loading?: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, sublabel, variant = 'default', loading = false, className = '' }) => {
  if (loading) {
    return (
      <Card variant={variant} className={className}>
        <Skeleton width="60%" height="12px" />
        <Skeleton width="80%" height="28px" className="mt-2" />
        <Skeleton width="40%" height="10px" className="mt-1" />
      </Card>
    );
  }
  return (
    <Card variant={variant} className={className}>
      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{label}</span>
      <div className="text-2xl font-bold text-text-primary mt-1">{value}</div>
      {sublabel && <span className="text-xs text-text-tertiary mt-0.5 block">{sublabel}</span>}
    </Card>
  );
};
