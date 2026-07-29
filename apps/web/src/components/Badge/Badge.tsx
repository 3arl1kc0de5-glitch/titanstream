import type React from 'react';

interface BadgeProps {
  count: number;
  variant?: 'red' | 'green' | 'grey';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  count,
  variant = 'red',
  size = 'sm',
  className = '',
}) => {
  const variantStyles = {
    red: 'bg-error-red text-white',
    green: 'bg-usdt-green text-app-bg',
    grey: 'bg-control-bg text-text-secondary',
  };

  const sizeStyles = {
    sm: 'min-w-[18px] h-[18px] text-[10px] px-1',
    md: 'min-w-[22px] h-[22px] text-xs px-1.5',
  };

  if (count <= 0) return null;

  return (
    <span
      className={`
        inline-flex items-center justify-center font-bold rounded-full
        ${variantStyles[variant]} ${sizeStyles[size]} ${className}
      `}
    >
      {count}
    </span>
  );
};
