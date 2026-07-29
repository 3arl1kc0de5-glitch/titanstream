import type React from 'react';

interface AvatarProps {
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'green' | 'blue' | 'grey' | 'gold';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  icon,
  size = 'md',
  variant = 'grey',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const variantStyles = {
    green: 'bg-usdt-green/15 text-usdt-green',
    blue: 'bg-ton-blue/15 text-ton-blue',
    grey: 'bg-control-bg text-text-secondary',
    gold: 'bg-gold/15 text-gold',
  };

  return (
    <div
      className={`
        flex items-center justify-center rounded-full flex-shrink-0
        ${sizeStyles[size]} ${variantStyles[variant]} ${className}
      `}
    >
      {icon}
    </div>
  );
};
