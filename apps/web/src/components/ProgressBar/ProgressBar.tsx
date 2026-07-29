import type React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  variant?: 'green' | 'blue' | 'gold';
  size?: 'sm' | 'md';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  variant = 'green',
  size = 'sm',
  className = '',
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const variantColors = {
    green: 'bg-usdt-green',
    blue: 'bg-ton-blue',
    gold: 'bg-gold',
  };

  const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
  };

  return (
    <div className={`w-full bg-control-bg rounded-full overflow-hidden ${sizeStyles[size]} ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-300 ease-out ${variantColors[variant]}`}
        style={{ width: `${clampedProgress}%` }}
      />
    </div>
  );
};
