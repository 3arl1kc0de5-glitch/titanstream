import { api, type ApiResponse } from './api';
import type { AuthResponse, SessionData } from '../store/useAuthStore';

export type AuthProvider = 'telegram' | 'web';

export interface TelegramLoginWidgetPayload {
  id: number | string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;

const createTraceId = () => `web_auth_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const trace = (traceId: string, stage: string, detail = '') => {
  console.info(`[AUTH_TRACE:${traceId}] ${stage}${detail ? ` ${detail}` : ''}`);
};

const createSession = (data: AuthResponse, platform: AuthProvider): SessionData => ({
  accessToken: data.accessToken,
  refreshToken: data.refreshToken,
  user: data.user,
  onboarding: data.onboarding,
  isNewUser: data.isNewUser,
  expiresAt: Date.now() + SESSION_DURATION,
  platform,
});

const unwrapAuthResponse = (response: { data: ApiResponse<AuthResponse> }, traceId: string, stage: string) => {
  if (!response.data.success || !response.data.data) {
    const message = response.data.error?.message || `${stage} failed`;
    trace(traceId, `${stage}.failed`, message);
    throw new Error(message);
  }
  return response.data.data;
};

export const authService = {
  trace,

  isTelegramMiniApp(): boolean {
    const tg = window.Telegram?.WebApp;
    return Boolean(tg && (tg.initData || tg.initDataUnsafe?.user));
  },

  getMiniAppInitData(): string {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      throw new Error('Telegram Mini App initData is not available. Please reopen Titan Stream from Telegram.');
    }
    return initData;
  },

  async authenticateMiniApp(): Promise<SessionData> {
    const traceId = createTraceId();
    trace(traceId, 'mini_app.detected', this.isTelegramMiniApp() ? 'yes' : 'no');
    const initData = this.getMiniAppInitData();
    trace(traceId, 'mini_app.init_data_present', `length=${initData.length}`);
    trace(traceId, 'mini_app.request_sent', 'POST /auth/telegram');

    const response = await api.post<ApiResponse<AuthResponse>>('/auth/telegram', { initData });
    const data = unwrapAuthResponse(response, traceId, 'mini_app.backend_verification');
    trace(traceId, 'mini_app.jwt_received', `user=${data.user.telegramUserId}`);
    const session = createSession(data, 'telegram');
    trace(traceId, 'mini_app.session_created', `isNewUser=${data.isNewUser}`);
    return session;
  },

  async authenticateWebLogin(payload: TelegramLoginWidgetPayload): Promise<SessionData> {
    const traceId = createTraceId();
    trace(traceId, 'web.payload_received', `telegramUserId=${payload?.id ?? 'missing'}`);
    trace(traceId, 'web.request_sent', 'POST /auth/telegram-login');

    const response = await api.post<ApiResponse<AuthResponse>>('/auth/telegram-login', payload);
    const data = unwrapAuthResponse(response, traceId, 'web.backend_verification');
    trace(traceId, 'web.jwt_received', `user=${data.user.telegramUserId}`);
    const session = createSession(data, 'web');
    trace(traceId, 'web.session_created', `isNewUser=${data.isNewUser}`);
    return session;
  },

  async refresh(refreshToken: string): Promise<Pick<SessionData, 'accessToken' | 'refreshToken' | 'expiresAt'>> {
    const response = await api.post<ApiResponse<{ accessToken: string; refreshToken: string }>>('/auth/refresh', { refreshToken });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Session refresh failed');
    }
    return {
      accessToken: response.data.data.accessToken,
      refreshToken: response.data.data.refreshToken,
      expiresAt: Date.now() + SESSION_DURATION,
    };
  },

  logout() {
    localStorage.removeItem('auth_token');
  },
};
