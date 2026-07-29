import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight, Globe } from 'lucide-react';
import { useCountryStore, SUPPORTED_COUNTRIES } from '../store/useCountryStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTelegram } from '../context/TelegramContext';

interface CountrySelectorProps {
  onComplete?: () => void;
}

/**
 * Full-screen overlay asking "Which country are you using TitanStream from?"
 * Shown after onboarding completes if the user hasn't selected a country yet.
 * Searchable list with flags.
 */
export const CountrySelector: React.FC<CountrySelectorProps> = ({ onComplete }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { selectCountry } = useCountryStore();
  const { setCurrencyPreference } = useSettingsStore();
  const { hapticFeedback } = useTelegram();

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return SUPPORTED_COUNTRIES;
    const q = searchQuery.toLowerCase();
    return SUPPORTED_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.currencyCode.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSelect = (code: string) => {
    hapticFeedback.impactOccurred('medium');
    const country = SUPPORTED_COUNTRIES.find((c) => c.code === code);
    if (!country) return;

    // Save to country store
    selectCountry(code);

    // Sync to settings store for backward compatibility
    const isLocal = country.code !== 'US';
    setCurrencyPreference(
      isLocal,
      country.name,
      country.currencyCode,
      country.currencySymbol,
      country.exchangeRate
    );

    // Mark currency as chosen
    localStorage.setItem('has_chosen_currency', 'true');

    if (onComplete) onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#06070b] flex flex-col select-none overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-6 h-6 rounded-full bg-usdt-green/20 text-usdt-green flex items-center justify-center font-black text-xs">₮</span>
          <span className="text-sm font-extrabold text-text-primary tracking-tight">TitanStream</span>
        </div>

        <div className="mt-4 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3">
            <Globe size={22} />
          </div>
          <h1 className="text-xl font-black text-text-primary tracking-tight font-sans">
            Which country are you using TitanStream from?
          </h1>
          <p className="text-xs text-text-secondary mt-2 leading-relaxed font-medium font-sans">
            This helps us show prices in your local currency and offer the best payment methods for your region.
          </p>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search country or currency..."
            className="w-full pl-9 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-text-primary placeholder-text-tertiary font-medium focus:outline-none focus:border-cyan-500/40 transition-colors"
          />
        </div>
      </div>

      {/* Country List */}
      <div className="flex-1 overflow-y-auto px-6 pb-24">
        <AnimatePresence>
          <div className="flex flex-col gap-2">
            {filteredCountries.map((country, idx) => (
              <motion.button
                key={country.code}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.2 }}
                onClick={() => handleSelect(country.code)}
                className="press-feedback w-full p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/30 flex items-center justify-between transition-all group text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{country.flag}</span>
                  <div>
                    <div className="text-sm font-extrabold text-text-primary group-hover:text-cyan-400 transition-colors font-sans">
                      {country.name}
                    </div>
                    <div className="text-[10px] text-text-tertiary font-mono font-bold mt-0.5 flex items-center gap-2">
                      <span>{country.currencyCode} ({country.currencySymbol})</span>
                      <span className="text-text-quaternary">•</span>
                      <span>{country.mobilePaymentMethods[0]}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-text-tertiary group-hover:text-cyan-400 transition-colors" />
              </motion.button>
            ))}

            {filteredCountries.length === 0 && (
              <div className="py-12 text-center text-xs text-text-tertiary font-medium">
                No countries match "{searchQuery}". Try a different search.
              </div>
            )}
          </div>
        </AnimatePresence>
      </div>

      {/* Bottom hint */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#06070b] via-[#06070b]/90 to-transparent p-6 pt-8">
        <p className="text-[10px] text-text-tertiary text-center font-medium font-sans">
          You can change your country anytime in Settings.
        </p>
      </div>
    </div>
  );
};
