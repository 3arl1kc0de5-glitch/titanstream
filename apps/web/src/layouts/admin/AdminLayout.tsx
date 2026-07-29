import type React from 'react';
import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import {
  LayoutDashboard, ShoppingCart, ClipboardList, Wallet,
  Bell, User, Settings, X,
} from 'lucide-react';
import { Badge } from '@/components/Badge';
import { AdminLoginScreen } from '@/components/admin/AdminLoginScreen';

const pageTitles: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/orders': 'Orders Center',
  '/admin/operations': 'Operations Queue',
  '/admin/liquidity': 'Liquidity Dashboard',
  '/admin/treasury': 'Treasury',
  '/admin/payment-rails': 'Payment Rails',
  '/admin/withdrawals': 'Withdrawals',
  '/admin/users': 'User Intelligence',
  '/admin/support': 'Support Center Workspace',
  '/admin/risk': 'Risk Center',
  '/admin/automation': 'Automation Center',
  '/admin/revenue': 'Revenue Dashboard',
  '/admin/notifications': 'Notifications',
  '/admin/audit': 'Audit Logs',
  '/admin/health': 'System Health',
  '/admin/settings': 'Settings',
};

const bottomNavItems = [
  { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/admin' },
  { label: 'Orders', icon: <ShoppingCart size={20} />, path: '/admin/orders' },
  { label: 'Queue', icon: <ClipboardList size={20} />, path: '/admin/operations' },
  { label: 'Treasury', icon: <Wallet size={20} />, path: '/admin/treasury' },
  { label: 'Alerts', icon: <Bell size={20} />, path: '/admin/notifications', badge: 3 },
];

export const AdminLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem('auth_token');
    return !!token && (token.startsWith('admin-token:') || token.length > 25);
  });
  const location = useLocation();
  const navigate = useNavigate();
  const title = pageTitles[location.pathname] || 'Admin';

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  if (!isAuthenticated) {
    return <AdminLoginScreen onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen bg-app-bg text-text-primary">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <AdminSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-64 h-full bg-app-bg-secondary border-r border-border overflow-y-auto">
            <div className="flex items-center justify-between h-14 px-4 border-b border-border">
              <span className="text-sm font-bold text-text-primary">TitanStream</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-control-bg">
                <X size={18} className="text-text-secondary" />
              </button>
            </div>
            <AdminSidebar collapsed={false} onToggle={() => {}} mobile />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader
          title={title}
          onMenuToggle={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 lg:pb-6 no-scrollbar">
          <Outlet />
        </main>

        {/* Mobile bottom navigation */}
        <nav className="fixed bottom-0 inset-x-0 z-30 lg:hidden bg-app-bg-secondary border-t border-border safe-area-bottom">
          <div className="flex items-center justify-around h-16 px-2">
            {bottomNavItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`relative flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[56px] min-h-[44px]
                  ${isActive(item.path)
                    ? 'text-usdt-green'
                    : 'text-text-tertiary hover:text-text-secondary'
                  }`}
              >
                <span className="relative">
                  {item.icon}
                  {item.badge && (
                    <Badge count={item.badge} variant="red" className="absolute -top-1.5 -right-2" />
                  )}
                </span>
                <span className="text-[10px] font-semibold leading-none">{item.label}</span>
              </button>
            ))}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors text-text-tertiary hover:text-text-secondary min-w-[56px] min-h-[44px]"
            >
              <User size={20} />
              <span className="text-[10px] font-semibold leading-none">More</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};
