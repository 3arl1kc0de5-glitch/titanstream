import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-usdt-green to-[#00c853] text-app-bg font-extrabold shadow-[0_4px_20px_rgba(0,230,118,0.35)] border border-white/10',
  secondary: 'bg-gradient-to-b from-white/[0.08] to-white/[0.02] text-text-primary border border-white/10 shadow-md font-bold',
  outline: 'bg-transparent border border-usdt-green/45 text-usdt-green hover:bg-usdt-green/10 shadow-[0_0_15px_rgba(0,230,118,0.15)] font-bold',
  ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/5 font-bold',
  danger: 'bg-error-red text-white font-extrabold shadow-[0_4px_15px_rgba(255,59,48,0.3)]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-2xl',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`
        press-feedback inline-flex items-center justify-center gap-2 font-medium
        transition-all duration-100 ease-in-out
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-50 pointer-events-none' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
