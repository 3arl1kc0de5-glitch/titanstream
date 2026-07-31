import React, { useEffect, useRef, useCallback } from 'react';
import { Loader2, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import { useAuthStore, type SessionData } from '../store/useAuthStore';
import { useTelegram } from '../context/TelegramContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTH_TIMEOUT_MS = 12_000;
const BOT_USERNAME = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string) || 'titanstream_bot';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSession(data: any, platform: 'telegram' | 'web'): SessionData {
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
    onboarding: data.onboarding,
    isNewUser: data.isNewUser,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    platform,
  };
}

// ─── AuthGate ─────────────────────────────────────────────────────────────────

/**
 * AuthGate — single component that owns the complete authentication lifecycle.
 *
 * Platform routing:
 *   Mini App  →  POST /auth/telegram (initData HMAC)
 *   Web       →  Telegram Login Widget → POST /auth/telegram-login
 *
 * The gate renders:
 *   - Nothing (transparent) when authentication succeeds — the parent renders the app
 *   - A loading screen while authentication is in progress
 *   - A clear error screen with retry when authentication fails
 *   - The Telegram Login Widget when running in a browser
 */
export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isReady, isMiniApp, webApp } = useTelegram();
  const { isAuthenticated, isAuthLoading, authError, session, isSessionExpired, setSession, setAuthLoading, setAuthError, clearSession } = useAuthStore();
  const authAttempted = useRef(false);
  const widgetMounted = useRef(false);
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  // ── Handle Telegram Login Widget callback (web only) ──────────────────────
  const handleWebWidgetLogin = useCallback(async (widgetPayload: any) => {
    const traceId = `web_${Date.now().toString(36)}`;
    console.info(`[AUTH_GATE:${traceId}] web.widget_callback received id=${widgetPayload?.id}`);
    setAuthLoading(true);
    setAuthError(null);

    const timeoutId = setTimeout(() => {
      setAuthLoading(false);
      setAuthError('Request timed out. Please try again.');
    }, AUTH_TIMEOUT_MS);

    try {
      const res = await api.post('/auth/telegram-login', widgetPayload);
      const body = res.data;
      clearTimeout(timeoutId);

      if (!body.success || !body.data) throw new Error(body.error?.message || 'Auth failed');
      console.info(`[AUTH_GATE:${traceId}] web.auth.success userId=${body.data.user.telegramUserId}`);
      setSession(buildSession(body.data, 'web'));
    } catch (err: any) {
      clearTimeout(timeoutId);
      const msg = err.response?.data?.error?.message || err.message || 'Telegram login failed';
      console.error(`[AUTH_GATE:${traceId}] web.auth.failed reason=${msg}`);
      setAuthLoading(false);
      setAuthError(msg);
    }
  }, [setSession, setAuthLoading, setAuthError]);

  // ── Mini App: auto-authenticate via initData ───────────────────────────────
  const authenticateMiniApp = useCallback(async () => {
    const tg = (window as any).Telegram?.WebApp;
    const initData = tg?.initData;
    const traceId = `tgapp_${Date.now().toString(36)}`;

    console.info(`[AUTH_GATE:${traceId}] mini_app.auth_start initData.present=${!!initData} initData.length=${initData?.length ?? 0}`);

    if (!initData) {
      const msg = 'Telegram identity data unavailable. Please reopen via @titanstream_bot.';
      console.error(`[AUTH_GATE:${traceId}] mini_app.auth_failed reason=no_init_data`);
      setAuthError(msg);
      setAuthLoading(false);
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    const timeoutId = setTimeout(() => {
      console.error(`[AUTH_GATE:${traceId}] mini_app.auth_failed reason=timeout_${AUTH_TIMEOUT_MS}ms`);
      setAuthLoading(false);
      setAuthError(`Could not reach TitanStream servers. Please check your connection and try again.`);
    }, AUTH_TIMEOUT_MS);

    try {
      const res = await api.post('/auth/telegram', { initData });
      const body = res.data;
      clearTimeout(timeoutId);

      if (!body.success || !body.data) throw new Error(body.error?.message || 'Unexpected server response');
      console.info(`[AUTH_GATE:${traceId}] mini_app.auth.success userId=${body.data.user.telegramUserId} isNew=${body.data.isNewUser}`);
      setSession(buildSession(body.data, 'telegram'));
    } catch (err: any) {
      clearTimeout(timeoutId);
      const msg = err.response?.data?.error?.message || err.message || 'Authentication failed';
      console.error(`[AUTH_GATE:${traceId}] mini_app.auth.failed reason=${msg}`);
      setAuthLoading(false);
      setAuthError(msg);
    }
  }, [setSession, setAuthLoading, setAuthError]);

  // ── Mount Web Login Widget ─────────────────────────────────────────────────
  const mountWidget = useCallback(() => {
    if (widgetMounted.current || !widgetContainerRef.current) return;
    widgetMounted.current = true;

    // Register the global callback before injecting the script
    (window as any).onTelegramAuth = (user: any) => handleWebWidgetLogin(user);

    const container = widgetContainerRef.current;
    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', BOT_USERNAME);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '14');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.onerror = () => {
      console.error('[AUTH_GATE] telegram_widget.script_load_failed');
    };
    container.appendChild(script);
    console.info(`[AUTH_GATE] web.widget.mounted botUsername=${BOT_USERNAME}`);
  }, [handleWebWidgetLogin]);

  // ── Main auth orchestration effect ────────────────────────────────────────
  useEffect(() => {
    if (!isReady) return; // Wait for Telegram SDK to initialize
    if (authAttempted.current) return;
    authAttempted.current = true;

    // Check for existing valid session first
    const authState = useAuthStore.getState();
    if (!authState.isSessionExpired() && authState.session?.accessToken) {
      console.info(`[AUTH_GATE] session.restored userId=${authState.session.user.telegramUserId}`);
      return; // Already authenticated, isAuthenticated will be true
    }

    if (authState.isSessionExpired() && authState.session) {
      console.info('[AUTH_GATE] session.expired clearing');
      clearSession();
    }

    if (isMiniApp) {
      authenticateMiniApp();
    }
    // Web: widget is mounted separately in the render via useEffect
  }, [isReady, isMiniApp, authenticateMiniApp, clearSession]);

  // Mount widget for web context after render
  useEffect(() => {
    if (!isReady || isMiniApp || isAuthenticated) return;
    mountWidget();
  }, [isReady, isMiniApp, isAuthenticated, mountWidget]);

  // ── Retry handler ──────────────────────────────────────────────────────────
  const handleRetry = () => {
    authAttempted.current = false;
    widgetMounted.current = false;
    setAuthError(null);
    if (isMiniApp) {
      authenticateMiniApp();
      authAttempted.current = true;
    }
  };

  // ── Render: authenticated → show app ──────────────────────────────────────
  if (isAuthenticated && !isSessionExpired()) {
    return <>{children}</>;
  }

  // ── Render: loading ────────────────────────────────────────────────────────
  if (isAuthLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#06070b] flex flex-col items-center justify-center select-none">
        <Loader2 size={32} className="text-usdt-green animate-spin mb-4" />
        <p className="text-text-secondary text-sm font-medium">
          {isMiniApp ? 'Verifying your identity…' : 'Authenticating…'}
        </p>
        <p className="text-text-tertiary text-xs mt-2 opacity-60">Powered by Telegram</p>
      </div>
    );
  }

  // ── Render: error ──────────────────────────────────────────────────────────
  if (authError) {
    return (
      <div className="fixed inset-0 z-50 bg-[#06070b] flex flex-col items-center justify-center select-none px-8">
        <div className="flex items-center gap-3 text-red-400 mb-4">
          <AlertCircle size={22} />
          <p className="text-sm font-semibold">Authentication Failed</p>
        </div>
        <p className="text-text-tertiary text-xs text-center max-w-xs mb-8 leading-relaxed">{authError}</p>
        <button
          onClick={handleRetry}
          className="flex items-center gap-2 py-[14px] px-8 rounded-2xl bg-[#2AABEE] text-white font-extrabold text-[14px] hover:brightness-110 transition-all active:scale-[0.97]"
        >
          <RefreshCw size={15} />
          Try Again
        </button>
        {!isMiniApp && (
          <button
            onClick={() => { widgetMounted.current = false; setAuthError(null); setTimeout(mountWidget, 100); }}
            className="mt-4 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Back to Telegram Login
          </button>
        )}
      </div>
    );
  }

  // ── Render: web login screen with Telegram Widget ─────────────────────────
  if (!isMiniApp && !isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-[#06070b] flex flex-col items-center select-none overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.06, 0.11, 0.06] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-usdt-green/10 rounded-full blur-[120px]"
          />
        </div>

        <div className="flex-[1.2]" />

        {/* Logo + brand */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex flex-col items-center text-center px-8 max-w-sm"
        >
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-[28px] bg-usdt-green/20 blur-2xl scale-150" />
            <div className="relative w-[88px] h-[88px] rounded-[28px] bg-gradient-to-br from-usdt-green via-emerald-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-usdt-green/20 border border-white/20">
              <span className="text-[40px] font-black text-white drop-shadow-md">₮</span>
            </div>
          </div>
          <h1 className="text-[34px] font-black text-text-primary tracking-tight font-sans leading-none">TitanStream</h1>
          <p className="text-[15px] text-text-secondary mt-3 font-semibold font-sans leading-snug">
            Participate in the<br />Cloud Computing Economy
          </p>
        </motion.div>

        <div className="flex-1" />

        {/* Telegram Login Widget */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-sm px-8 pb-10 flex flex-col items-center gap-5"
        >
          {/* Widget injection point */}
          <div ref={widgetContainerRef} className="flex justify-center w-full min-h-[54px]" />

          {/* Or launch in Telegram App */}
          <button
            onClick={() => {
              const botUsername = (import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string) || 'titanstream_bot';
              window.open(`https://t.me/${botUsername}/app`, '_blank');
            }}
            className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold text-text-secondary flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <span>⚡ Open in Telegram App</span>
          </button>

          <div className="flex items-center justify-center gap-2 text-[10px] text-text-tertiary font-medium">
            <ShieldCheck size={12} className="text-usdt-green/50" />
            <span>Secure login via Telegram • No passwords needed</span>
          </div>
        </motion.div>

        <div className="flex-1 max-h-[40px]" />
      </div>
    );
  }

  // Mini App waiting for SDK to be ready (isReady = false)
  return (
    <div className="fixed inset-0 z-50 bg-[#06070b] flex flex-col items-center justify-center select-none">
      <Loader2 size={28} className="text-usdt-green animate-spin mb-4" />
      <p className="text-text-secondary text-sm">Connecting…</p>
    </div>
  );
};
