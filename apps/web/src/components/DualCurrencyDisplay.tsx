import React from 'react';
import { useCountryStore } from '../store/useCountryStore';
import { useSettingsStore } from '../store/useSettingsStore';

interface CurrencyDisplayProps {
  amount: number;        // Always in USDT
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showCurrencyLabel?: boolean;
}

/**
 * Renders a monetary amount in the user's preferred currency.
 * If the user prefers local currency, converts and displays in local.
 * Otherwise displays in USDT.
 * The toggle lives in the Header (top-right flag button).
 */
export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  size = 'md',
  className = '',
  showCurrencyLabel = true,
}) => {
  const { selectedCountry, getLocalAmount } = useCountryStore();
  const { preferLocalCurrency } = useSettingsStore();

  const showLocal = preferLocalCurrency && !!selectedCountry && selectedCountry.code !== 'US';

  const sizeStyles = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const safeAmount = Number(amount) || 0;

  if (showLocal) {
    return (
      <span className={`font-extrabold font-mono ${sizeStyles[size]} ${className}`}>
        {getLocalAmount(safeAmount)}
      </span>
    );
  }

  return (
    <span className={`font-extrabold font-mono ${sizeStyles[size]} ${className}`}>
      {safeAmount < 1 ? safeAmount.toFixed(4) : safeAmount.toFixed(2)}
      {showCurrencyLabel && ' USDT'}
    </span>
  );
};
