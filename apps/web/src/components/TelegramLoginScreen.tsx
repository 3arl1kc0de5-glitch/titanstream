import React, { useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Server, Sparkles, ShieldCheck, Users, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { authService, type TelegramLoginWidgetPayload } from '../services/auth.service';

export const TelegramLoginScreen: React.FC = () => {
  const { isAuthLoading, authError, setAuthLoading, setAuthError, setSession } = useAuthStore();
  const authStarted = useRef(false);
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  const isMiniApp = authService.isTelegramMiniApp();

  const runMiniAppAuthentication = useCallback(async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const session = await authService.authenticateMiniApp();
      setSession(session);
      authService.trace('dashboard', 'mini_app.dashboard_loaded', `user=${session.user.telegramUserId}`);
    } catch (err: any) {
      const message = err.response?.data?.error?.message || err.message || 'Unable to verify your Telegram identity. Please try again.';
      console.error(`[AUTH_TRACE:mini_app] authentication.failed ${message}`);
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  }, [setAuthError, setAuthLoading, setSession]);

  // Auto-initiate auth for Mini App context on mount
  useEffect(() => {
    if (!isMiniApp || authStarted.current) return;
    authStarted.current = true;
    runMiniAppAuthentication();
  }, [isMiniApp, runMiniAppAuthentication]);

  const handleRetry = () => {
    authStarted.current = false;
    runMiniAppAuthentication();
  };

  const handleTelegramWidgetLogin = useCallback(async (userPayload: TelegramLoginWidgetPayload) => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const session = await authService.authenticateWebLogin(userPayload);
      setSession(session);
      authService.trace('dashboard', 'web.dashboard_loaded', `user=${session.user.telegramUserId}`);
    } catch (err: any) {
      const message = err.response?.data?.error?.message || err.message || 'Telegram login failed. Please try again.';
      console.error(`[AUTH_TRACE:web] authentication.failed ${message}`);
      setAuthError(message);
    } finally {
      setAuthLoading(false);
    }
  }, [setAuthError, setAuthLoading, setSession]);

  // Attach global callback and inject Telegram Login Widget for standalone Web context
  useEffect(() => {
    if (isMiniApp) return;
    authService.trace('web_widget', 'browser.detected');

    (window as any).onTelegramAuth = (user: any) => {
      handleTelegramWidgetLogin(user);
    };

    if (widgetContainerRef.current) {
      widgetContainerRef.current.innerHTML = '';

      const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'titanstream_bot';
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.async = true;
      script.setAttribute('data-telegram-login', botUsername);
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-radius', '14');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.setAttribute('data-request-access', 'write');
      script.onload = () => authService.trace('web_widget', 'rendered');
      script.onerror = () => setAuthError('Unable to load Telegram Login. Please refresh the page and try again.');

      widgetContainerRef.current.appendChild(script);
    }
  }, [handleTelegramWidgetLogin, isMiniApp, setAuthError]);

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
    return (
      <div className="fixed inset-0 z-50 bg-[#06070b] flex flex-col items-center justify-center select-none">
        <Loader2 size={32} className="text-usdt-green animate-spin mb-4" />
        <p className="text-text-secondary text-sm">Connecting...</p>
      </div>
    );
  }

  // ── Web context — branded login screen with Telegram Login Widget ──

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
        className="relative z-10 w-full max-w-sm px-8 pb-10 flex flex-col items-center gap-4"
      >
        <div ref={widgetContainerRef} className="flex justify-center w-full min-h-[48px]" />

        {isAuthLoading && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Loader2 size={14} className="animate-spin" />
            <span>Creating secure session...</span>
          </div>
        )}

        {authError && (
          <div className="flex items-start gap-2 text-xs text-red-300 text-center leading-snug">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-[10px] text-text-tertiary font-medium">
          <ShieldCheck size={12} className="text-usdt-green/50" />
          <span>Secure login via Telegram • No passwords needed</span>
        </div>
      </motion.div>

      <div className="flex-1 max-h-[40px]" />
    </div>
  );
};
