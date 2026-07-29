import type React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, ClipboardList, Droplets, Wallet, CreditCard,
  ArrowUpFromLine, Users, Shield, Zap, BarChart3, Bell, ScrollText,
  Activity, Settings, ChevronLeft, Headphones,
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Main',
    items: [
      { label: 'Overview', icon: <LayoutDashboard size={18} />, path: '/admin' },
      { label: 'Orders', icon: <ShoppingCart size={18} />, path: '/admin/orders' },
      { label: 'Operations Queue', icon: <ClipboardList size={18} />, path: '/admin/operations' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Liquidity', icon: <Droplets size={18} />, path: '/admin/liquidity' },
      { label: 'Treasury', icon: <Wallet size={18} />, path: '/admin/treasury' },
      { label: 'Payment Rails', icon: <CreditCard size={18} />, path: '/admin/payment-rails' },
      { label: 'Withdrawals', icon: <ArrowUpFromLine size={18} />, path: '/admin/withdrawals' },
      { label: 'Revenue', icon: <BarChart3 size={18} />, path: '/admin/revenue' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Users', icon: <Users size={18} />, path: '/admin/users' },
      { label: 'Support Center', icon: <Headphones size={18} />, path: '/admin/support', badge: 2 },
      { label: 'Risk Center', icon: <Shield size={18} />, path: '/admin/risk', badge: 3 },
      { label: 'Automation', icon: <Zap size={18} />, path: '/admin/automation' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Notifications', icon: <Bell size={18} />, path: '/admin/notifications' },
      { label: 'Audit Logs', icon: <ScrollText size={18} />, path: '/admin/audit' },
      { label: 'System Health', icon: <Activity size={18} />, path: '/admin/health' },
      { label: 'Settings', icon: <Settings size={18} />, path: '/admin/settings' },
    ],
  },
];

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobile?: boolean;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed, onToggle, mobile = false }) => {
  const location = useLocation();
  const navigate = useNavigate();

  if (mobile) {
    return (
      <aside className="flex flex-col h-full">
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 no-scrollbar">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">{section.title}</p>
              {section.items.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors mb-0.5 min-h-[44px]
                      ${active ? 'bg-usdt-green/15 text-usdt-green font-semibold' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}`}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded-full bg-error-red text-white text-[10px] font-bold">{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside className={`h-screen bg-app-bg-secondary border-r border-border flex flex-col transition-all duration-200 ${collapsed ? 'w-[60px]' : 'w-[240px]'}`}>
      <div className="flex items-center justify-between h-14 px-4 border-b border-border">
        {!collapsed && (
          <span className="text-sm font-bold text-text-primary tracking-wide">TitanStream</span>
        )}
        <button
          onClick={onToggle}
          className={`p-1.5 rounded-lg hover:bg-control-bg transition-colors text-text-secondary ${collapsed ? 'mx-auto' : ''}`}
        >
          <ChevronLeft size={16} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 no-scrollbar">
        {navSections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const active = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-0.5
                    ${active ? 'bg-usdt-green/15 text-usdt-green font-semibold' : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'}
                    ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{item.label}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded-full bg-error-red text-white text-[10px] font-bold">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && item.badge && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-error-red text-white text-[9px] font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-border">
        <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
          <span className="w-2 h-2 rounded-full bg-usdt-green animate-pulse" />
          {!collapsed && <span className="text-xs text-text-tertiary">System Operational</span>}
        </div>
      </div>
    </aside>
  );
};
