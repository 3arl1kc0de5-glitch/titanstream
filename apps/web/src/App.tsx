import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { AdminLayout } from './layouts/admin/AdminLayout';
import { MineScreen } from './pages/Mine';
import { FriendsScreen } from './pages/Friends';
import { BoostScreen } from './pages/Boost';
import { TreasuryScreen } from './pages/Treasury';
import { SplashScreen } from './pages/Splash';
import { WalletScreen } from './pages/Wallet/WalletScreen';
import { GrowthScreen } from './pages/Growth/GrowthScreen';
import { OverviewPage } from './pages/admin/overview';
import { OrdersPage } from './pages/admin/orders';
import { OperationsPage } from './pages/admin/operations';
import { LiquidityPage } from './pages/admin/liquidity';
import { TreasuryPage } from './pages/admin/treasury';
import { PaymentRailsPage } from './pages/admin/payment-rails';
import { WithdrawalsPage } from './pages/admin/withdrawals';
import { UsersPage } from './pages/admin/users';
import { RiskPage } from './pages/admin/risk';
import { AutomationPage } from './pages/admin/automation';
import { RevenuePage } from './pages/admin/revenue';
import { NotificationsPage } from './pages/admin/notifications';
import { AuditPage } from './pages/admin/audit';
import { HealthPage } from './pages/admin/health';
import { SettingsPage } from './pages/admin/settings';
import { useNavigationStore } from './store/useNavigationStore';
import { useMiningStore } from './store/useMiningStore';
import { useWalletStore } from './store/useWalletStore';
import { useReferralStore } from './store/useReferralStore';
import { useTreasuryStore } from './store/useTreasuryStore';
import { useAuthStore, detectUserCountry } from './store/useAuthStore';
import { useCountryStore, SUPPORTED_COUNTRIES } from './store/useCountryStore';
import { useSettingsStore } from './store/useSettingsStore';
import { TelegramLoginScreen } from './components/TelegramLoginScreen';
import { OnboardingOverlay } from './components/OnboardingOverlay';
import { CountrySelector } from './components/CountrySelector';

import { AdminSupportPage } from './pages/admin/support';

// ─── Main App (authenticated, onboarded, country selected) ──────────────────

function MainApp() {
  const { activeTab } = useNavigationStore();
  const { updateBalance } = useWalletStore();

  // Live balance ticking
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useMiningStore.getState();
      if (state.isMiningLocked()) return;

      const wallet = useWalletStore.getState();
      const treasury = useTreasuryStore.getState();
      const boostMultiplier = treasury.dailyBoostActive ? 1.5 : 1.0;
      const delta = state.baseSpeedGhs * state.coolerMultiplier * boostMultiplier * 0.000000148385;

      if (state.activeCurrency === 'USDT') {
        updateBalance({ usdtBalance: wallet.usdtBalance + delta * 0.4 });
      } else {
        updateBalance({ tonBalance: wallet.tonBalance + delta });
      }

      useReferralStore.getState().tickEarnings(delta * 0.01, delta * 0.005);
    }, 100);

    return () => clearInterval(interval);
  }, [updateBalance]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'friends': return <FriendsScreen />;
      case 'boost': return <BoostScreen />;
      case 'wallet': return <WalletScreen />;
      case 'growth': return <GrowthScreen />;
      case 'mine': return <MineScreen />;
      case 'treasury': return <TreasuryScreen />;
      default: return <MineScreen />;
    }
  };

  return (
    <MainLayout>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.99 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="w-full h-full"
        >
          {renderTabContent()}
        </motion.div>
      </AnimatePresence>
    </MainLayout>
  );
}

// ─── App Shell — Orchestrates the full auth/onboarding/country flow ─────────

export function App() {
  const [showSplash, setShowSplash] = useState(true);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isSessionExpired = useAuthStore((s) => s.isSessionExpired);
  const isAuthLoading = useAuthStore((s) => s.isAuthLoading);
  const onboardingComplete = useAuthStore((s) => s.onboardingComplete);
  const countrySelected = useAuthStore((s) => s.countrySelected);
  const setDetectedCountry = useAuthStore((s) => s.setDetectedCountry);
  const markCountrySelected = useAuthStore((s) => s.markCountrySelected);
  const clearSession = useAuthStore((s) => s.clearSession);

  const { hasSelectedCountry, selectCountry } = useCountryStore();
  const { setCurrencyPreference } = useSettingsStore();

  // Check session expiry on mount
  useEffect(() => {
    if (isAuthenticated && isSessionExpired()) {
      clearSession();
    }
  }, [isAuthenticated, isSessionExpired, clearSession]);

  // Precise IP-based country detection on first auth
  useEffect(() => {
    if (isAuthenticated && !countrySelected) {
      detectUserCountry().then((code) => {
        if (code) {
          setDetectedCountry(code);
          // Auto-select if we have this country in our supported list
          const match = SUPPORTED_COUNTRIES.find(
            (c) => c.code === code || (code === 'EU' && c.code === 'EU')
          );
          if (match) {
            // Pre-select but still show the country selector for confirmation
            selectCountry(match.code);
            setCurrencyPreference(
              match.code !== 'US',
              match.name,
              match.currencyCode,
              match.currencySymbol,
              match.exchangeRate
            );
          }
        }
      });
    }
  }, [isAuthenticated, countrySelected, setDetectedCountry, selectCountry, setCurrencyPreference]);

  // 1. Splash screen
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // 2. Auth loading — backend verification in progress (Mini App auto-auth)
  if (isAuthLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#06070b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-usdt-green/40 border-t-usdt-green rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">Verifying your identity...</p>
        </div>
      </div>
    );
  }

  // 3. Auth gate — not authenticated or session expired
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="operations" element={<OperationsPage />} />
          <Route path="liquidity" element={<LiquidityPage />} />
          <Route path="treasury" element={<TreasuryPage />} />
          <Route path="payment-rails" element={<PaymentRailsPage />} />
          <Route path="withdrawals" element={<WithdrawalsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="support" element={<AdminSupportPage />} />
          <Route path="risk" element={<RiskPage />} />
          <Route path="automation" element={<AutomationPage />} />
          <Route path="revenue" element={<RevenuePage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="health" element={<HealthPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<TelegramLoginScreen />} />
      </Routes>
    );
  }

  // 4. First-time welcome journey (5 cards)
  if (!onboardingComplete) {
    return <OnboardingOverlay />;
  }

  // 5. Country selection (shown once after onboarding)
  if (!countrySelected) {
    return (
      <CountrySelector
        onComplete={() => {
          markCountrySelected();
          localStorage.setItem('has_chosen_currency', 'true');
        }}
      />
    );
  }

  // 6. Authenticated, onboarded, country set → full app
  return (
    <Routes>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="operations" element={<OperationsPage />} />
        <Route path="liquidity" element={<LiquidityPage />} />
        <Route path="treasury" element={<TreasuryPage />} />
        <Route path="payment-rails" element={<PaymentRailsPage />} />
        <Route path="withdrawals" element={<WithdrawalsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="support" element={<AdminSupportPage />} />
        <Route path="risk" element={<RiskPage />} />
        <Route path="automation" element={<AutomationPage />} />
        <Route path="revenue" element={<RevenuePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="health" element={<HealthPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<MainApp />} />
    </Routes>
  );
}
