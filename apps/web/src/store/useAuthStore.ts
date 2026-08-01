import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PrimaryCurrency = 'USDT' | 'UGX';

export interface AuthUser {
  telegramUserId: number;
  telegramUsername: string | null;
  firstName: string;
  lastName: string | null;
  photoUrl: string | null;
  languageCode: string;
  state: string;
  isReady: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  onboarding: {
    currentStep: string;
    isCompleted: boolean;
  };
  readiness: any;
  isNewUser: boolean;
}

export interface SessionData {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  onboarding: {
    currentStep: string;
    isCompleted: boolean;
  };
  isNewUser: boolean;
  expiresAt: number;
  platform: 'telegram' | 'web';
}

interface AuthState {
  _hasHydrated: boolean;
  isAuthenticated: boolean;
  session: SessionData | null;
  onboardingComplete: boolean;
  countrySelected: boolean;
  detectedCountryCode: string | null;
  locationDetected: boolean;
  isAuthLoading: boolean;
  authError: string | null;

  setSession: (session: SessionData) => void;
  clearSession: () => void;
  isSessionExpired: () => boolean;
  refreshSession: (newExpiresAt: number) => void;
  updateTokens: (accessToken: string, refreshToken: string, expiresAt: number) => void;
  setAuthLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;
  markOnboardingComplete: () => void;
  markCountrySelected: () => void;
  setDetectedCountry: (code: string) => void;
  setLocationAndCurrency: (country: string, currency: PrimaryCurrency) => void;
}

const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      isAuthenticated: false,
      session: null,
      onboardingComplete: false,
      countrySelected: false,
      detectedCountryCode: null,
      locationDetected: false,
      isAuthLoading: false,
      authError: null,

      setSession: (session) => {
        localStorage.setItem('auth_token', session.accessToken);
        const hasChosenCurrency = localStorage.getItem('has_chosen_currency') === 'true';
        const expiresAt = session.expiresAt || (Date.now() + 30 * 24 * 60 * 60 * 1000);
        set({
          isAuthenticated: true,
          session: {
            ...session,
            expiresAt,
          },
          onboardingComplete: session.onboarding?.isCompleted ?? !session.isNewUser,
          countrySelected: hasChosenCurrency,
          isAuthLoading: false,
          authError: null,
        });
      },

      clearSession: () => {
        localStorage.removeItem('auth_token');
        set({
          isAuthenticated: false,
          session: null,
          authError: null,
        });
      },

      isSessionExpired: () => {
        const { session } = get();
        if (!session || !session.accessToken) return true;
        if (!session.expiresAt || typeof session.expiresAt !== 'number') return false;
        return Date.now() > session.expiresAt;
      },

      refreshSession: (newExpiresAt) => {
        const { session } = get();
        if (session) {
          set({
            session: {
              ...session,
              expiresAt: newExpiresAt,
            },
          });
        }
      },

      updateTokens: (accessToken, refreshToken, expiresAt) => {
        const { session } = get();
        localStorage.setItem('auth_token', accessToken);
        if (session) {
          set({
            isAuthenticated: true,
            session: {
              ...session,
              accessToken,
              refreshToken,
              expiresAt,
            },
          });
        }
      },

      setAuthLoading: (loading) => {
        set({ isAuthLoading: loading });
      },

      setAuthError: (error) => {
        set({ authError: error, isAuthLoading: false });
      },

      markOnboardingComplete: () => {
        set({ onboardingComplete: true });
      },

      markCountrySelected: () => {
        set({ countrySelected: true });
      },

      setDetectedCountry: (code: string) => {
        set({ detectedCountryCode: code, locationDetected: true });
      },

      setLocationAndCurrency: (country, currency) => {
        const { session } = get();
        if (session) {
          set({
            session: {
              ...session,
              country,
              currency,
            },
            locationDetected: true,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        session: state.session,
        onboardingComplete: state.onboardingComplete,
        countrySelected: state.countrySelected,
        detectedCountryCode: state.detectedCountryCode,
        locationDetected: state.locationDetected,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hasHydrated = true;
          useAuthStore.setState({ _hasHydrated: true });
        }
      },
    },
  ),
);

export const handleSessionExpiry = () => {
  const authStore = useAuthStore.getState();
  if (authStore.isSessionExpired()) {
    authStore.clearSession();
    return true;
  }
  return false;
};

export const detectUserCountry = async (): Promise<string | null> => {
  try {
    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const data = await response.json();
      if (data.country_code) {
        return data.country_code;
      }
    }
  } catch {
    // Silent fallback
  }

  try {
    const response = await fetch('http://ip-api.com/json/?fields=countryCode', {
      signal: AbortSignal.timeout(4000),
    });
    if (response.ok) {
      const data = await response.json();
      if (data.countryCode) {
        return data.countryCode;
      }
    }
  } catch {
    // Silent fallback
  }

  return null;
};
