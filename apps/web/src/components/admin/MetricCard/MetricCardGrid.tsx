import type React from 'react';

interface MetricCardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

const gridCols: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

export const MetricCardGrid: React.FC<MetricCardGridProps> = ({ children, columns = 4, className = '' }) => (
  <div className={`grid gap-4 ${gridCols[columns]} ${className}`}>{children}</div>
);
