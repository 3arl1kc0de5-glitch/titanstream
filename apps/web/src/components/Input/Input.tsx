import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  suffix?: React.ReactNode;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  suffix,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-text-secondary">{label}</label>
      )}
      <div className="relative flex items-center">
        <input
          className={`
            w-full bg-control-bg/85 backdrop-blur-md text-text-primary rounded-xl px-4 py-3.5
            text-sm placeholder:text-text-tertiary
            border border-white/10
            focus:border-usdt-green focus:outline-none
            transition-colors duration-150 shadow-inner
            ${error ? 'border-error-red' : ''}
            ${suffix ? 'pr-16' : ''}
            ${className}
          `}
          {...props}
        />
        {suffix && (
          <div className="absolute right-3 flex items-center">{suffix}</div>
        )}
      </div>
      {error && (
        <span className="text-xs text-error-red">{error}</span>
      )}
    </div>
  );
};
