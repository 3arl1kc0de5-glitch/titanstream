import React from 'react';
import { useMiningStore } from '../../../store/useMiningStore';
import { useSettingsStore } from '../../../store/useSettingsStore';
import { useCountryStore } from '../../../store/useCountryStore';
import { formatAdaptiveCounter } from '../../../utils/format';

export const BalanceDisplay: React.FC = () => {
  const { activeCurrency, baseSpeedGhs, displayMultiplier, displayUnclaimed } = useMiningStore();
  const { preferLocalCurrency } = useSettingsStore();
  const { selectedCountry } = useCountryStore();

  const currentDisplay = Math.max(0, Number(displayUnclaimed) || 0);
  const isUsdt = activeCurrency === 'USDT';
  const showLocal = preferLocalCurrency && !!selectedCountry && selectedCountry.code !== 'US';

  // Format the balance display based on currency preference
  const formatBalance = () => {
    if (isUsdt && showLocal && selectedCountry) {
      const rate = Number(selectedCountry.exchangeRate) || 1;
      const localVal = currentDisplay * rate;
      return {
        value: formatAdaptiveCounter(localVal),
        label: selectedCountry.currencyCode,
      };
    }
    return {
      value: formatAdaptiveCounter(currentDisplay),
      label: activeCurrency,
    };
  };

  const bal = formatBalance();

  // Convert GH/s to CU (Compute Units) — 1 GH/s = 10 CU
  const computeUnits = ((Number(baseSpeedGhs) || 0) * (Number(displayMultiplier) || 1) * 10).toFixed(0);

  return (
    <div className="flex flex-col items-center justify-center gap-1.5 my-2">
      {/* Label: Claimable Stream Output */}
      <span className="text-[11px] font-extrabold uppercase tracking-widest text-text-secondary/80">
        Claimable Stream Output
      </span>

      {/* Live Odometer Ticker Balance with Text Gradient */}
      <div className="flex items-baseline gap-2 font-mono tracking-tight">
        <span
          className={`text-4xl font-extrabold tracking-tight drop-shadow-md ${
            isUsdt ? 'text-gradient-usdt' : 'text-gradient-ton'
          }`}
        >
          {bal.value}
        </span>
        <span className="text-lg font-bold text-text-secondary">{bal.label}</span>
      </div>

      {/* Speed Indicator Pill with Live Pulsing Radar Beacon */}
      <div className="bg-control-bg/80 backdrop-blur-md border border-white/10 rounded-full px-3.5 py-1.5 text-xs font-extrabold text-usdt-green flex items-center gap-2 shadow-lg">
        <div className="relative flex items-center justify-center w-2 h-2">
          <span className="absolute w-3 h-3 rounded-full bg-usdt-green opacity-75 animate-ping" />
          <span className="relative w-2 h-2 rounded-full bg-usdt-green" />
        </div>
        <span>{computeUnits} CU</span>
      </div>
    </div>
  );
};
