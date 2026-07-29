import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://tetherstream-production-e99c.up.railway.app/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const initData = window.Telegram?.WebApp?.initData;
  if (initData) {
    config.headers['X-Telegram-Init-Data'] = initData;
  }
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = String(originalRequest?.url || '');

    if (status !== 401 || originalRequest?._retry || url.includes('/auth/refresh') || url.includes('/auth/telegram')) {
      return Promise.reject(error);
    }

    const session = useAuthStore.getState().session;
    if (!session?.refreshToken) {
      useAuthStore.getState().clearSession();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refreshResponse = await axios.post(
        `${api.defaults.baseURL}/auth/refresh`,
        { refreshToken: session.refreshToken },
        { headers: { 'Content-Type': 'application/json' } },
      );
      const body = refreshResponse.data;
      if (!body.success || !body.data?.accessToken || !body.data?.refreshToken) {
        throw new Error(body.error?.message || 'Session refresh failed');
      }

      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
      useAuthStore.getState().updateTokens(body.data.accessToken, body.data.refreshToken, expiresAt);
      originalRequest.headers.Authorization = `Bearer ${body.data.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      useAuthStore.getState().clearSession();
      return Promise.reject(refreshError);
    }
  },
);

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}
