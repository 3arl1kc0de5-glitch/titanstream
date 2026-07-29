import type React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  rounded = 'md',
  className = '',
}) => {
  const roundedStyles = {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    full: 'rounded-full',
  };

  return (
    <div
      className={`skeleton ${roundedStyles[rounded]} ${className}`}
      style={{ width, height }}
    />
  );
};

/** Card-shaped skeleton placeholder */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-card-bg rounded-xl p-4 space-y-3 ${className}`}>
    <Skeleton width="40%" height="14px" />
    <Skeleton width="70%" height="12px" />
    <Skeleton width="100%" height="40px" />
  </div>
);
