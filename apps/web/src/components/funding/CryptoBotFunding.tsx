import React, { useState } from 'react';
import { Bot, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { settlementService, type SettlementSessionView } from '../../services/settlementService';
import { useWalletStore } from '../../store/useWalletStore';
import { useTelegram } from '../../context/TelegramContext';
import { SettlementTracker } from './SettlementTracker';

interface CryptoBotFundingProps {
  providerId: string;
  onSuccess?: (session: SettlementSessionView) => void;
  onCancel?: () => void;
}

export const CryptoBotFunding: React.FC<CryptoBotFundingProps> = ({
  providerId,
  onSuccess,
  onCancel,
}) => {
  const [usdtAmount, setUsdtAmount] = useState<string>('10');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSession, setActiveSessionState] = useState<SettlementSessionView | null>(null);

  const { setActiveSession, fetchSettlementHistory } = useWalletStore();
  const { hapticFeedback } = useTelegram();

  const numericAmount = parseFloat(usdtAmount) || 0;

  const handleQuickSelect = (val: number) => {
    hapticFeedback.selectionChanged();
    setUsdtAmount(val.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount < 1) {
      setErrorMessage('Minimum funding amount is 1 USDT');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    hapticFeedback.impactOccurred('medium');

    try {
      const session = await settlementService.createSession({
        provider: providerId || 'CRYPTOBOT',
        asset: 'USDT',
        requestedAmount: usdtAmount,
        expectedCryptoAmount: usdtAmount,
        exchangeRate: '1.0',
      });

      setActiveSessionState(session);
      setActiveSession(session);
      fetchSettlementHistory();
      if (onSuccess) onSuccess(session);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to create CryptoBot payment request';
      setErrorMessage(message);
      hapticFeedback.notificationOccurred('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (activeSession) {
    return (
      <SettlementTracker
        session={activeSession}
        onClose={onCancel}
        onRetry={() => setActiveSessionState(null)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header Info */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
          <Bot size={20} />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-text-primary">Telegram CryptoBot</h3>
          <p className="text-xs text-text-tertiary">Pay directly via Telegram CryptoBot wallet</p>
        </div>
      </div>

      {/* Amount Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-text-tertiary">USDT Amount</label>
          <span className="text-[11px] font-semibold text-text-tertiary">Min: 1 USDT</span>
        </div>

        <div className="relative flex items-center">
          <input
            type="number"
            min="1"
            max="10000"
            step="any"
            value={usdtAmount}
            onChange={(e) => setUsdtAmount(e.target.value)}
            placeholder="10"
            className="w-full h-12 pl-4 pr-16 bg-control-bg border border-white/10 rounded-xl text-lg font-mono font-extrabold text-text-primary focus:outline-none focus:border-sky-400 transition-colors"
          />
          <span className="absolute right-4 font-mono font-bold text-xs text-sky-400 bg-sky-400/10 px-2 py-1 rounded">
            USDT
          </span>
        </div>

        {/* Quick Amount Chips */}
        <div className="flex items-center gap-2 pt-1">
          {[5, 10, 25, 50, 100].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handleQuickSelect(val)}
              className="press-feedback flex-1 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono font-bold text-text-secondary hover:text-text-primary"
            >
              ${val}
            </button>
          ))}
        </div>
      </div>

      {/* Workflow assurance note */}
      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-text-tertiary">
        <ShieldCheck size={15} className="text-sky-400 shrink-0 mt-0.5" />
        <span>
          Clicking continue will issue a CryptoBot invoice reference. Your balance updates automatically upon provider approval.
        </span>
      </div>

      {/* Error display */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || numericAmount < 1}
        className="press-feedback w-full py-3.5 rounded-xl bg-sky-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 disabled:opacity-50"
      >
        {isSubmitting ? (
          <span>Creating CryptoBot Request...</span>
        ) : (
          <>
            <span>Generate Invoice</span>
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
};
