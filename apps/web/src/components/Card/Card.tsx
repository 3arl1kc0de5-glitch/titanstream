import type React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'gold' | 'success' | 'dashed';
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  className = '',
  onClick,
}) => {
  const baseStyles = 'rounded-xl p-4 transition-all duration-150';

  const variantStyles = {
    default: 'bg-card-bg',
    gold: 'bg-card-bg border border-gold shimmer-gold',
    success: 'bg-usdt-green/10 border border-usdt-green/30',
    dashed: 'bg-transparent border border-dashed border-border-dashed',
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${onClick ? 'press-feedback cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
};
