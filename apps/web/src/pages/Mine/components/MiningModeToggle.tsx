import type React from 'react';
import { useMiningStore } from '../../../store/useMiningStore';
import { useWalletStore } from '../../../store/useWalletStore';
import { Lock, Crown } from 'lucide-react';
import { showToast } from '../../../components/Toast';
import { useCountryStore } from '../../../store/useCountryStore';
import { useSettingsStore } from '../../../store/useSettingsStore';

export const MiningModeToggle: React.FC = () => {
  const { activeCurrency, toggleCurrency, tonUnlocked, tonPrice, unlockTON } = useMiningStore();
  const { usdtBalance, updateBalance } = useWalletStore();
  const { preferLocalCurrency } = useSettingsStore();
  const { selectedCountry, getLocalAmount } = useCountryStore();
  const showLocal = preferLocalCurrency && !!selectedCountry && selectedCountry.code !== 'US';

  return (
    <div className="flex items-center justify-center my-3">
      <div className="bg-control-bg p-1 rounded-full flex items-center gap-1 border border-border/40">
        <button
          onClick={() => toggleCurrency('USDT')}
          className={`
            flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold press-feedback transition-all
            ${activeCurrency === 'USDT'
              ? 'bg-usdt-green text-app-bg shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
            }
          `}
        >
          <span className="w-4 h-4 rounded-full bg-app-bg/20 flex items-center justify-center font-bold text-[10px]">₮</span>
          USDT
        </button>

        <button
          onClick={() => {
            if (!tonUnlocked) {
              if (usdtBalance >= tonPrice) {
                updateBalance({ usdtBalance: usdtBalance - tonPrice });
                unlockTON();
                toggleCurrency('TON');
                showToast('TON compute channel activated. Welcome to premium network processing.', 'success');
              } else {
                showToast(`Insufficient balance. ${getLocalAmount(tonPrice)} required to activate TON compute channel.`, 'error');
              }
            } else {
              toggleCurrency('TON');
            }
          }}
          className={`
            flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold press-feedback transition-all relative
            ${activeCurrency === 'TON'
              ? 'bg-ton-blue text-white shadow-sm'
              : tonUnlocked
              ? 'text-text-secondary hover:text-text-primary'
              : 'text-text-tertiary'
            }
          `}
        >
          {!tonUnlocked && (
            <div className="absolute -top-1 -right-1">
              <Lock size={10} className="text-gold" />
            </div>
          )}
          <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center font-bold text-[10px]">
            {tonUnlocked ? '💎' : <Lock size={10} />}
          </span>
          {tonUnlocked ? 'TON' : (
            <span className="flex flex-col items-center leading-none">
              <span>PREMIUM</span>
              <span className="text-[8px] font-normal text-gold">{getLocalAmount(tonPrice)}</span>
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
