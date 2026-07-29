import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuthStore, handleSessionExpiry } from '../store/useAuthStore';
import { CurrencyPreferenceModal } from '../components/CurrencyPreferenceModal';

interface TelegramContextType {
  webApp: Window['Telegram'] extends { WebApp?: infer T } ? T | null : null;
  user: { id: number; first_name: string; last_name?: string; username?: string; language_code?: string } | null;
  isReady: boolean;
  platform: 'telegram' | 'web';
  hapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  logout: () => void;
}

const TelegramContext = createContext<TelegramContextType>({
  webApp: null,
  user: null,
  isReady: false,
  platform: 'web',
  hapticFeedback: {
    impactOccurred: () => {},
    notificationOccurred: () => {},
    selectionChanged: () => {},
  },
  logout: () => {},
});

export const TelegramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [webApp, setWebApp] = useState<unknown>(null);
  const [tgUser, setTgUser] = useState<{ id: number; first_name: string; last_name?: string; username?: string; language_code?: string } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [platform, setPlatform] = useState<'telegram' | 'web'>('web');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const authAttempted = useRef(false);

  const {
    clearSession,
    isSessionExpired,
    setLocationAndCurrency,
    markOnboardingComplete,
  } = useAuthStore();

  useEffect(() => {
    if (authAttempted.current) return;
    authAttempted.current = true;

    // 1. Check for existing valid session first
    const authState = useAuthStore.getState();
    if (!authState.isSessionExpired() && authState.session) {
      console.info(`[AUTH_TRACE:session_restore] session.reused user=${authState.session.user.telegramUserId}`);
      const existing = authState.session;
      setTgUser({
        id: existing.user.telegramUserId,
        first_name: existing.user.firstName,
        last_name: existing.user.lastName || undefined,
        username: existing.user.telegramUsername || undefined,
      });
      setPlatform(existing.platform);
      setIsReady(true);
      return;
    }

    // Clear expired session
    if (authState.isSessionExpired()) {
      console.info('[AUTH_TRACE:session_restore] session.expired clearing local session');
      clearSession();
    }

    // 2. Mini App Context - initialize Telegram SDK only. Auth gate performs backend authentication.
    const tg = window.Telegram?.WebApp;
    const isTgApp = !!(tg && (tg.initData || tg.initDataUnsafe?.user));
    console.info(`[AUTH_TRACE:telegram_context] telegram.detected ${isTgApp ? 'yes' : 'no'}`);

    if (isTgApp) {
      tg.ready?.();
      tg.expand?.();
      setWebApp(tg);
      setPlatform('telegram');

      const telegramUser = tg.initDataUnsafe?.user;
      if (telegramUser) {
        setTgUser(telegramUser);
      }

      console.info(`[AUTH_TRACE:telegram_context] init_data_present ${tg.initData ? 'yes' : 'no'} length=${tg.initData?.length || 0}`);
      setIsReady(true);
    } else {
      // 3. Web App Context — no Telegram session available
      console.info('[AUTH_TRACE:telegram_context] browser.detected showing Telegram Login Widget');
      setPlatform('web');
      setTgUser(null);
      setIsReady(true);
    }
  }, [clearSession, isSessionExpired]);

  // Periodic session check
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (handleSessionExpiry()) {
        setTgUser(null);
      }
    }, 60000);

    return () => clearInterval(checkInterval);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setTgUser(null);
  }, [clearSession]);

  const handleCurrencySelection = (currency: 'USDT' | 'UGX') => {
    setLocationAndCurrency('UG', currency);
    markOnboardingComplete();
    setShowCurrencyModal(false);
  };

  const hapticFeedback = {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
    },
    notificationOccurred: (type: 'error' | 'success' | 'warning') => {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
    },
    selectionChanged: () => {
      window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
    },
  };

  return (
    <TelegramContext.Provider value={{ webApp: webApp as any, user: tgUser, isReady, platform, hapticFeedback, logout }}>
      {children}
      <CurrencyPreferenceModal
        isOpen={showCurrencyModal}
        onClose={() => setShowCurrencyModal(false)}
        onSelectCurrency={handleCurrencySelection}
      />
    </TelegramContext.Provider>
  );
};

export const useTelegram = () => useContext(TelegramContext);
