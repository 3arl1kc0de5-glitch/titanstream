import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Server, Sparkles, ShieldCheck, Users, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore, type SessionData } from '../store/useAuthStore';
import { api } from '../services/api';

const authenticateWithApi = async () => {
  const tg = (window as any).Telegram?.WebApp;
  if (!tg?.initData) return null;
  const response = await api.post('/auth/telegram', { initData: tg.initData });
  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.error?.message || 'Unexpected server response');
  }
  return body.data;
};

const createSessionFromAuth = (data: { accessToken: string; refreshToken: string; user: any; onboarding: any; isNewUser: boolean }, platform: 'telegram' | 'web'): SessionData => ({
  accessToken: data.accessToken,
  refreshToken: data.refreshToken,
  user: data.user,
  onboarding: data.onboarding,
  isNewUser: data.isNewUser,
  expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  platform,
});

export const TelegramLoginScreen: React.FC = () => {
  const { isAuthLoading, authError, setAuthLoading, setAuthError, setSession } = useAuthStore();
  const authStarted = useRef(false);

  const isMiniApp = !!((window as any).Telegram?.WebApp?.initData || (window as any).Telegram?.WebApp?.initDataUnsafe?.user);

  // Auto-initiate auth for Mini App context on mount
  useEffect(() => {
    if (!isMiniApp || authStarted.current) return;
    authStarted.current = true;

    setAuthError(null);
    setAuthLoading(true);

    authenticateWithApi()
      .then((data) => {
        if (data?.accessToken && data?.user) {
          setSession(createSessionFromAuth(data, 'telegram'));
        }
      })
      .catch((err: any) => {
        const message = err.response?.data?.error?.message || err.message || 'Authentication failed';
        setAuthError(message);
      });
  }, [isMiniApp, setAuthLoading, setAuthError, setSession]);

  const handleRetry = () => {
    authStarted.current = false;
    setAuthError(null);
    setAuthLoading(true);
    authenticateWithApi()
      .then((data) => {
        if (data?.accessToken && data?.user) {
          setSession(createSessionFromAuth(data, 'telegram'));
        }
      })
      .catch((err: any) => {
        const message = err.response?.data?.error?.message || err.message || 'Authentication failed';
        setAuthError(message);
      });
  };

  const handleTelegramWidgetLogin = async (userPayload: any) => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const response = await api.post('/auth/telegram-login', userPayload);
      const body = response.data;
      if (body.success && body.data) {
        setSession(createSessionFromAuth(body.data, 'web'));
      } else {
        throw new Error(body.error?.message || 'Web authentication failed');
      }
    } catch (err: any) {
      const message = err.response?.data?.error?.message || err.message || 'Telegram login failed';
      setAuthError(message);
    }
  };

  useEffect(() => {
    if (isMiniApp) return;
    (window as any).onTelegramAuth = (user: any) => {
      handleTelegramWidgetLogin(user);
    };
  }, [isMiniApp]);

  const handleWebLogin = () => {
    const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'titanstream_bot';
    const tgAppUrl = `https://t.me/${botUsername}/app`;
    window.open(tgAppUrl, '_blank');
  };

  // ── Mini App states: loading, error, or fallback (never shows a bot-redirect button) ──

  if (isMiniApp) {
    if (isAuthLoading) {
      return (
        <div className="fixed inset-0 z-50 bg-[#06070b] flex flex-col items-center justify-center select-none">
          <Loader2 size={32} className="text-usdt-green animate-spin mb-4" />
          <p className="text-text-secondary text-sm">Verifying your identity...</p>
        </div>
      );
    }

    if (authError) {
      return (
        <div className="fixed inset-0 z-50 bg-[#06070b] flex flex-col items-center justify-center select-none px-8">
          <div className="flex items-center gap-3 text-red-400 mb-6">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">Authentication failed</p>
          </div>
          <p className="text-text-tertiary text-xs text-center mb-8 max-w-xs">{authError}</p>
          <button
            onClick={handleRetry}
            className="py-[14px] px-8 rounded-2xl bg-[#2AABEE] text-white font-extrabold text-[14px] hover:brightness-110 press-feedback transition-all active:scale-[0.97]"
          >
            Retry Authentication
          </button>
        </div>
      );
    }

    // Mini App but not loading and no error — auth hasn't started yet (edge case)
    // Show loading instead of any button
    return (
      <div className="fixed inset-0 z-50 bg-[#06070b] flex flex-col items-center justify-center select-none">
        <Loader2 size={32} className="text-usdt-green animate-spin mb-4" />
        <p className="text-text-secondary text-sm">Connecting...</p>
      </div>
    );
  }

  // ── Web context — branded login screen with bot redirect ──

  const features = [
    { icon: <Server size={14} />, label: 'Cloud Computing Capacity' },
    { icon: <Users size={14} />, label: 'Growing Community' },
    { icon: <Sparkles size={14} />, label: 'Real-Time Earnings' },
    { icon: <ShieldCheck size={14} />, label: 'Full Transparency' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#06070b] flex flex-col items-center select-none overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.06, 0.1, 0.06],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-usdt-green/10 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.04, 0.08, 0.04],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-[20%] right-[10%] w-[300px] h-[300px] bg-cyan-500/8 rounded-full blur-[100px]"
        />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="flex-[1.2]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center text-center px-8 max-w-sm"
      >
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-[28px] bg-usdt-green/20 blur-2xl scale-150" />
          <div className="relative w-[88px] h-[88px] rounded-[28px] bg-gradient-to-br from-usdt-green via-emerald-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-usdt-green/20 border border-white/20">
            <span className="text-[40px] font-black text-white drop-shadow-md">₮</span>
          </div>
        </div>

        <h1 className="text-[34px] font-black text-text-primary tracking-tight font-sans leading-none">
          TitanStream
        </h1>
        <p className="text-[15px] text-text-secondary mt-3 font-semibold font-sans leading-snug">
          Participate in the<br />Cloud Computing Economy
        </p>

        <div className="grid grid-cols-2 gap-2 mt-8 w-full">
          {features.map((f, idx) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.08, duration: 0.4 }}
              className="flex items-center gap-2 text-[11px] font-bold text-text-tertiary bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5"
            >
              <span className="text-usdt-green/70">{f.icon}</span>
              <span>{f.label}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="flex-1" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-sm px-8 pb-10 flex flex-col gap-4"
      >
        <button
          onClick={handleWebLogin}
          className="w-full py-[18px] rounded-2xl bg-[#2AABEE] text-white font-extrabold text-[15px] flex items-center justify-center gap-3 shadow-xl shadow-[#2AABEE]/30 hover:brightness-110 hover:shadow-2xl hover:shadow-[#2AABEE]/40 press-feedback transition-all active:scale-[0.97]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          <span>Continue with Telegram</span>
        </button>

        <div className="flex items-center justify-center gap-2 text-[10px] text-text-tertiary font-medium">
          <ShieldCheck size={12} className="text-usdt-green/50" />
          <span>Secure login via Telegram • No passwords needed</span>
        </div>
      </motion.div>

      <div className="flex-1 max-h-[40px]" />
    </div>
  );
};
