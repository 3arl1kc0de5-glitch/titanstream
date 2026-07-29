import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Bot, CreditCard, ChevronRight, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { settlementService, type SettlementProviderItem } from '../../services/settlementService';
import { MobileMoneyFunding } from './MobileMoneyFunding';
import { CryptoBotFunding } from './CryptoBotFunding';
import { useTelegram } from '../../context/TelegramContext';

interface FundingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FundingModal: React.FC<FundingModalProps> = ({ isOpen, onClose }) => {
  const [providers, setProviders] = useState<SettlementProviderItem[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<SettlementProviderItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { hapticFeedback } = useTelegram();

  useEffect(() => {
    if (isOpen) {
      loadProviders();
    } else {
      setSelectedProvider(null);
    }
  }, [isOpen]);

  const loadProviders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await settlementService.getProviders({ asset: 'USDT' });
      setProviders(data);
    } catch (err: any) {
      console.warn('Failed to load providers from API:', err?.message);
      // Fallback fallback defaults if network or auth error during preview
      setProviders([
        {
          provider: 'MERCHANT_MOBILE_MONEY',
          name: 'Mobile Money',
          displayName: 'Mobile Money (M-Pesa)',
          type: 'MERCHANT_MOBILE_MONEY',
          status: 'ENABLED',
          healthStatus: 'HEALTHY',
          priority: 10,
          supported_assets: ['USDT'],
        },
        {
          provider: 'CRYPTOBOT',
          name: 'CryptoBot',
          displayName: 'Telegram CryptoBot',
          type: 'CRYPTOBOT',
          status: 'ENABLED',
          healthStatus: 'HEALTHY',
          priority: 20,
          supported_assets: ['USDT'],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'MERCHANT_MOBILE_MONEY':
      case 'INTERNAL_OPERATIONS':
        return <Smartphone size={22} className="text-usdt-green" />;
      case 'CRYPTOBOT':
        return <Bot size={22} className="text-sky-400" />;
      default:
        return <CreditCard size={22} className="text-purple-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 select-none overflow-y-auto">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="w-full max-w-md bg-app-bg border border-white/10 rounded-3xl p-5 shadow-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto my-auto"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-usdt-green/20 text-usdt-green flex items-center justify-center text-sm font-black">
                ₮
              </div>
              <h2 className="text-base font-extrabold text-text-primary">
                {selectedProvider ? selectedProvider.displayName || selectedProvider.name : 'Add USDT Funds'}
              </h2>
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

          {/* Body Content */}
          {selectedProvider ? (
            <div>
              {/* Back navigation button */}
              <button
                onClick={() => {
                  hapticFeedback.selectionChanged();
                  setSelectedProvider(null);
                }}
                className="mb-4 text-xs font-bold text-usdt-green flex items-center gap-1 hover:underline"
              >
                ← Choose Different Payment Method
              </button>

              {/* Render Provider Workflow */}
              {selectedProvider.provider === 'CRYPTOBOT' ? (
                <CryptoBotFunding
                  providerId={selectedProvider.provider}
                  onCancel={onClose}
                />
              ) : (
                <MobileMoneyFunding
                  providerId={selectedProvider.provider}
                  onCancel={onClose}
                />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-text-tertiary">
                Choose a settlement provider to deposit USDT into your TitanStream balance.
              </p>

              {/* Loading State */}
              {isLoading ? (
                <div className="py-10 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw size={24} className="animate-spin text-usdt-green" />
                  <span className="text-xs text-text-tertiary">Fetching active settlement providers...</span>
                </div>
              ) : error ? (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-3">
                  <AlertCircle size={20} className="shrink-0" />
                  <span>{error}</span>
                </div>
              ) : (
                /* Dynamic Provider List */
                <div className="space-y-2.5">
                  {providers.map((item) => (
                    <button
                      key={item.provider}
                      onClick={() => {
                        hapticFeedback.impactOccurred('medium');
                        setSelectedProvider(item);
                      }}
                      className="press-feedback w-full p-4 rounded-2xl glass-panel border border-white/10 hover:border-usdt-green/40 flex items-center justify-between transition-all group text-left"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-control-bg border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                          {getProviderIcon(item.provider)}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-text-primary group-hover:text-usdt-green transition-colors">
                              {item.displayName || item.name}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-usdt-green/10 text-usdt-green border border-usdt-green/20">
                              Instant
                            </span>
                          </div>
                          <p className="text-xs text-text-tertiary mt-0.5">
                            {item.provider === 'CRYPTOBOT'
                              ? 'Pay using Telegram @CryptoBot invoice'
                              : 'Pay via local Mobile Money / M-Pesa'}
                          </p>
                        </div>
                      </div>

                      <ChevronRight size={18} className="text-text-tertiary group-hover:text-usdt-green group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}

                  {/* Future Providers Teaser */}
                  <div className="p-3 rounded-2xl bg-white/5 border border-dashed border-white/10 flex items-center gap-2.5 text-xs text-text-tertiary">
                    <Sparkles size={16} className="text-amber-400 shrink-0" />
                    <span>More global settlement rails (Cards, TON Native, Bank Transfer) launching soon.</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
