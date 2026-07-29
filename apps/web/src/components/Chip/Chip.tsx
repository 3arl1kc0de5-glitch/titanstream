import type React from 'react';

interface ChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  active = false,
  onClick,
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        press-feedback whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium
        transition-all duration-150 ease-out
        ${active
          ? 'bg-usdt-green text-app-bg'
          : 'bg-control-bg text-text-primary hover:bg-border'
        }
        ${className}
      `}
    >
      {label}
    </button>
  );
};
