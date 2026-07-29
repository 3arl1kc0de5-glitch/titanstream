import type React from 'react';
import { useMiningStore } from '../../../store/useMiningStore';
import { Thermometer, Flame, ShieldAlert } from 'lucide-react';

export const CoolerSlider: React.FC = () => {
  const { coolerMultiplier, maxMultiplier, setMultiplier, isOverheated, cooldownTimer } = useMiningStore();

  const percentage = isOverheated ? 100 : Math.min(100, Math.max(0, ((coolerMultiplier - 1) / (maxMultiplier - 1)) * 100));
  const temperature = isOverheated ? 99.9 : Math.min(99.9, 30 + (coolerMultiplier - 1.0) * 3.2);

  return (
    <div className="w-full px-5 my-4 flex flex-col gap-2.5">
      {/* Header indicators */}
      <div className="flex items-center justify-between text-xs font-extrabold font-mono text-text-secondary">
        <span className={`px-2 py-0.5 rounded-full flex items-center gap-1 border ${
          isOverheated 
            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
            : 'text-usdt-green bg-usdt-green/10 border-usdt-green/30'
        }`}>
          {(isOverheated || temperature > 70) && <Flame size={12} className="text-error-red animate-bounce" />}
          {isOverheated ? `Core Cooling Active (${cooldownTimer}s)` : `×${coolerMultiplier.toFixed(1)} Core Multiplier`}
        </span>
        <span className={`flex items-center gap-0.5 ${isOverheated ? 'text-rose-400 font-bold' : 'text-text-tertiary'}`}>
          <Thermometer size={12} className={isOverheated ? 'text-rose-400' : 'text-text-secondary'} />
          {temperature.toFixed(0)}°C
        </span>
      </div>

      {/* iOS Styled Custom Slider */}
      <div className={`relative w-full h-3 bg-control-bg/80 border rounded-full p-0.5 flex items-center shadow-inner overflow-hidden ${
        isOverheated ? 'border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.4)]' : 'border-white/10'
      }`}>
        {/* Glowing filled track */}
        <div
          className={`h-full rounded-full transition-all duration-75 ${
            isOverheated || temperature > 70
              ? 'bg-gradient-to-r from-[#ff3d00] to-[#ff1744] shadow-[0_0_12px_#ff1744] animate-pulse'
              : 'bg-gradient-to-r from-usdt-green/60 to-usdt-green shadow-[0_0_12px_rgba(0,230,118,0.6)]'
          }`}
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min="1"
          max={maxMultiplier}
          step="0.1"
          disabled={isOverheated}
          value={coolerMultiplier}
          onChange={(e) => setMultiplier(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
      </div>

      <div className="text-center text-[10px] font-bold uppercase tracking-wider">
        {isOverheated ? (
          <span className="text-rose-400 flex items-center justify-center gap-1">
            <ShieldAlert size={12} /> Cooling system active. Core is cooling down ({cooldownTimer}s).
          </span>
        ) : (
          <span className="text-text-tertiary">Tap the Titan Core to boost active processing throughput.</span>
        )}
      </div>
    </div>
  );
};

