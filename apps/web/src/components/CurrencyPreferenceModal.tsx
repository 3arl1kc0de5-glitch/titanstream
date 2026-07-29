import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, Coins, MapPin } from 'lucide-react';
import { useTelegram } from '../context/TelegramContext';
import { useAuthStore, type PrimaryCurrency } from '../store/useAuthStore';

interface CurrencyPreferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCurrency: (currency: PrimaryCurrency) => void;
}

export const CurrencyPreferenceModal: React.FC<CurrencyPreferenceModalProps> = ({
  isOpen,
  onClose,
  onSelectCurrency
}) => {
  const { hapticFeedback } = useTelegram();

  const handleSelect = (currency: PrimaryCurrency) => {
    hapticFeedback.impactOccurred('medium');
    onSelectCurrency(currency);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="w-full max-w-md bg-app-bg border border-white/10 rounded-3xl p-5 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-usdt-green/20 text-usdt-green flex items-center justify-center">
                <MapPin size={18} />
              </div>
              <h2 className="text-base font-extrabold text-text-primary">Location Detected</h2>
            </div>
            <button
              onClick={() => {
                hapticFeedback.impactOccurred('light');
                onClose();
              }}
              className="press-feedback p-1.5 rounded-full bg-white/5 border border-white/10 text-text-secondary hover:text-text-primary"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <div className="bg-control-bg/30 border border-white/5 rounded-2xl p-4">
              <p className="text-xs text-text-secondary leading-relaxed">
                We detected you're in Uganda. Would you like to use <span className="text-usdt-green font-bold">USDT</span> or <span className="text-gold font-bold">UGX</span> as your primary currency?
              </p>
            </div>

            {/* Currency Options */}
            <div className="space-y-3">
              <button
                onClick={() => handleSelect('USDT')}
                className="press-feedback w-full p-4 rounded-2xl glass-panel border border-white/10 hover:border-usdt-green/40 flex items-center gap-4 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-usdt-green/20 border border-usdt-green/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <DollarSign size={24} className="text-usdt-green" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-extrabold text-text-primary group-hover:text-usdt-green transition-colors">
                    USDT
                  </div>
                  <div className="text-[10px] text-text-secondary mt-0.5">
                    Tether USD - Stablecoin
                  </div>
                </div>
                <div className="text-[10px] font-mono font-bold bg-usdt-green/10 text-usdt-green px-2 py-1 rounded-full border border-usdt-green/20">
                  Recommended
                </div>
              </button>

              <button
                onClick={() => handleSelect('UGX')}
                className="press-feedback w-full p-4 rounded-2xl glass-panel border border-white/10 hover:border-gold/40 flex items-center gap-4 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-gold/20 border border-gold/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Coins size={24} className="text-gold" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-extrabold text-text-primary group-hover:text-gold transition-colors">
                    UGX
                  </div>
                  <div className="text-[10px] text-text-secondary mt-0.5">
                    Ugandan Shilling
                  </div>
                </div>
              </button>
            </div>

            {/* Info */}
            <div className="text-center">
              <p className="text-[10px] text-text-tertiary">
                You can change this preference later in settings
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
