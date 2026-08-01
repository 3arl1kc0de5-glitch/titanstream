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
import { AdminSupportPage } from './pages/admin/support';
import { useNavigationStore } from './store/useNavigationStore';
import { useMiningStore } from './store/useMiningStore';
import { useWalletStore } from './store/useWalletStore';
import { useReferralStore } from './store/useReferralStore';
import { useTreasuryStore } from './store/useTreasuryStore';
import { useAuthStore, detectUserCountry } from './store/useAuthStore';
import { useCountryStore, SUPPORTED_COUNTRIES } from './store/useCountryStore';
import { useSettingsStore } from './store/useSettingsStore';
import { AuthGate } from './components/AuthGate';
import { OnboardingOverlay } from './components/OnboardingOverlay';
import { CountrySelector } from './components/CountrySelector';
import { ErrorBoundary } from './components/ErrorBoundary';

// ─── Admin Routes (accessible without user auth) ─────────────────────────────

function AdminRoutes() {
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
    </Routes>
  );
}

// ─── Main App (fully authenticated + onboarded) ───────────────────────────────

function MainApp() {
  const { activeTab } = useNavigationStore();
  const { updateBalance } = useWalletStore();

  // Live balance & yield ticking engine
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useMiningStore.getState();
      if (state.isMiningLocked()) return;

      const treasury = useTreasuryStore.getState();
      const boostMultiplier = treasury.dailyBoostActive ? 1.5 : 1.0;
      
      // Calibrated passive stream yield rate per 100ms
      const isUsdt = state.activeCurrency === 'USDT';
      const spinnerIdx = isUsdt ? state.usdtSpinnerIdx : state.tonSpinnerIdx;
      const machine = MACHINE_CATALOG[spinnerIdx];

      const baseYieldRate = machine.passiveYieldRate || 0.0001;
      const delta = state.baseSpeedGhs * state.coolerMultiplier * boostMultiplier * baseYieldRate;

      if (isUsdt && machine.earningsCap && machine.earningsCap > 0) {
        if (state.trialEarnings < machine.earningsCap) {
          const remainingCap = Math.max(0, machine.earningsCap - state.trialEarnings);
          const cappedDelta = Math.min(delta, remainingCap);
          useMiningStore.setState((s) => ({
            unclaimedBalance: s.unclaimedBalance + cappedDelta,
            trialEarnings: Math.min(machine.earningsCap!, s.trialEarnings + cappedDelta),
          }));
        }
      } else {
        useMiningStore.setState((s) => ({
          unclaimedBalance: s.unclaimedBalance + delta,
        }));
      }

      useReferralStore.getState().tickEarnings(delta * 0.01, delta * 0.005);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Periodic background state synchronizer (every 5 seconds)
  useEffect(() => {
    const syncState = async () => {
      try {
        await Promise.all([
          useWalletStore.getState().fetchBalanceFromEngine(),
          useMiningStore.getState().fetchMiningState(),
          useTreasuryStore.getState().fetchTreasuryState(),
        ]);
      } catch (err) {
        console.warn('[SYNC] Periodic background synchronization notice:', err);
      }
    };
    
    // Initial sync
    syncState();
    
    const interval = setInterval(syncState, 5000);
    return () => clearInterval(interval);
  }, []);

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

// ─── App Shell ────────────────────────────────────────────────────────────────

export function App() {
  const [showSplash, setShowSplash] = useState(true);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const onboardingComplete = useAuthStore((s) => s.onboardingComplete);
  const countrySelected = useAuthStore((s) => s.countrySelected);
  const setDetectedCountry = useAuthStore((s) => s.setDetectedCountry);
  const markCountrySelected = useAuthStore((s) => s.markCountrySelected);

  const { hasSelectedCountry, selectCountry } = useCountryStore();
  const { setCurrencyPreference } = useSettingsStore();

  const isCountrySet = countrySelected || hasSelectedCountry || localStorage.getItem('has_chosen_currency') === 'true';

  // IP-based country detection on first auth
  useEffect(() => {
    if (isAuthenticated && !isCountrySet) {
      detectUserCountry().then((code) => {
        if (code) {
          setDetectedCountry(code);
          const match = SUPPORTED_COUNTRIES.find((c) => c.code === code || (code === 'EU' && c.code === 'EU'));
          if (match) {
            selectCountry(match.code);
            setCurrencyPreference(match.code !== 'US', match.name, match.currencyCode, match.currencySymbol, match.exchangeRate);
            markCountrySelected();
            localStorage.setItem('has_chosen_currency', 'true');
          }
        }
      });
    }
  }, [isAuthenticated, isCountrySet, setDetectedCountry, selectCountry, setCurrencyPreference, markCountrySelected]);

  // 1. Splash screen (always first)
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // 2. Admin routes bypass AuthGate entirely (operator access)
  if (window.location.pathname.startsWith('/admin')) {
    return <AdminRoutes />;
  }

  // 3. AuthGate wraps the entire authenticated experience.
  //    It handles: loading, error, web widget, mini app auth.
  //    Only renders children when auth is confirmed.
  return (
    <ErrorBoundary>
      <AuthGate>
        {/* 4. Onboarding overlay (new users) */}
        {!onboardingComplete ? (
          <OnboardingOverlay />
        ) : !isCountrySet ? (
          /* 5. Country selection (once after onboarding) */
          <CountrySelector
            onComplete={() => {
              markCountrySelected();
              localStorage.setItem('has_chosen_currency', 'true');
            }}
          />
        ) : (
          /* 6. Fully authenticated, onboarded, country set → full app */
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
        )}
      </AuthGate>
    </ErrorBoundary>
  );
}
