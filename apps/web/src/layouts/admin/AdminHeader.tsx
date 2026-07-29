import type React from 'react';
import { useState } from 'react';
import { Search, Bell, Menu, X, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '@/store/useSettingsStore';

interface AdminHeaderProps {
  title: string;
  onMenuToggle?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ title, onMenuToggle }) => {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [killModalOpen, setKillModalOpen] = useState(false);
  const { pauseDeposits, pauseWithdrawals, maintenanceMode, toggleKillSwitch } = useSettingsStore();

  const isWarningActive = pauseDeposits || pauseWithdrawals || maintenanceMode;

  return (
    <header className="h-14 bg-app-bg-secondary border-b border-border flex items-center justify-between px-3 sm:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-control-bg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
          aria-label="Open menu"
        >
          <Menu size={20} className="text-text-secondary" />
        </button>
        <h1 className="text-base sm:text-lg font-bold text-text-primary truncate">{title}</h1>
        
        {/* Dashboard Health Status Banner */}
        <button
          onClick={() => setKillModalOpen(true)}
          className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition-colors ${
            maintenanceMode
              ? 'bg-rose-600/30 text-rose-300 border border-rose-500 animate-pulse'
              : pauseWithdrawals || pauseDeposits
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-usdt-green/15 text-usdt-green border border-usdt-green/30'
          }`}
          title="Click to manage Global Emergency Controls"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isWarningActive ? 'bg-rose-400 animate-ping' : 'bg-usdt-green'}`} />
          <span>
            {maintenanceMode
              ? '🔴 Maintenance Mode Active'
              : pauseWithdrawals
              ? '🟡 Withdrawals Paused'
              : pauseDeposits
              ? '🟡 Deposits Paused'
              : '🟢 All Systems Operational'}
          </span>
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Emergency Kill Switches Quick Trigger */}
        <button
          onClick={() => setKillModalOpen(true)}
          className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-extrabold text-xs flex items-center gap-1.5"
          title="Emergency Control Panel"
        >
          <ShieldAlert size={14} />
          <span className="hidden md:inline">Emergency Controls</span>
        </button>

        {/* Desktop search */}
        <div className="relative hidden md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search orders, users, operators..."
            className="w-48 lg:w-64 bg-control-bg/50 text-text-primary rounded-lg pl-9 pr-3 py-2 text-sm border border-white/5 focus:border-usdt-green focus:outline-none placeholder:text-text-tertiary"
          />
        </div>

        {/* Mobile search toggle */}
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-control-bg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
          aria-label="Search"
        >
          {searchOpen ? <X size={18} className="text-text-secondary" /> : <Search size={18} className="text-text-secondary" />}
        </button>

        <button
          className="relative p-2 rounded-lg hover:bg-control-bg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
          onClick={() => navigate('/admin/notifications')}
          aria-label="Notifications"
        >
          <Bell size={18} className="text-text-secondary" />
          <Badge count={3} variant="red" className="absolute -top-0.5 -right-0.5" />
        </button>

        <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-border">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-usdt-green/15 text-usdt-green flex items-center justify-center text-xs font-bold flex-shrink-0">
            AD
          </div>
          <div className="hidden sm:block min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">Admin (Founder)</p>
            <p className="text-xs text-text-tertiary truncate">admin@titanstream.io</p>
          </div>
        </div>
      </div>

      {/* Emergency Control Modal */}
      {killModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-app-bg border border-white/10 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
                <ShieldAlert size={18} className="text-rose-400" /> Global Emergency Safety Controls
              </h3>
              <button onClick={() => setKillModalOpen(false)} className="p-1 rounded-full bg-white/5 text-text-tertiary hover:text-text-primary">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-text-tertiary leading-relaxed">
              Instantly toggle platform emergency kill switches. All administrative actions require safety confirmation and create permanent audit logs.
            </p>

            <div className="space-y-3">
              {[
                { key: 'pauseDeposits' as const, label: 'Pause Deposits', state: pauseDeposits, desc: 'Halt all incoming USSD and CryptoBot deposit sessions.' },
                { key: 'pauseWithdrawals' as const, label: 'Pause Withdrawals', state: pauseWithdrawals, desc: 'Freeze instant withdrawal executions.' },
                { key: 'maintenanceMode' as const, label: 'Maintenance Mode', state: maintenanceMode, desc: 'Place full ecosystem in maintenance mode.' },
              ].map((sw) => (
                <div key={sw.key} className="flex items-center justify-between p-3 rounded-2xl bg-control-bg border border-white/10">
                  <div>
                    <div className="text-xs font-bold text-text-primary">{sw.label}</div>
                    <div className="text-[11px] text-text-tertiary">{sw.desc}</div>
                  </div>
                  <button
                    onClick={() => {
                      const word = sw.state ? 'RESUME' : 'PAUSE';
                      const input = prompt(`Type "${word}" to confirm changing state for ${sw.label}:`);
                      if (input === word) {
                        toggleKillSwitch(sw.key);
                        alert(`${sw.label} status updated.`);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-colors ${
                      sw.state
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'bg-white/5 border border-white/10 text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {sw.state ? 'PAUSED' : 'Active'}
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 text-right">
              <button onClick={() => setKillModalOpen(false)} className="px-4 py-2 rounded-xl bg-usdt-green text-app-bg font-extrabold text-xs">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile search bar */}
      {searchOpen && (
        <div className="fixed left-0 right-0 top-14 z-30 p-3 bg-app-bg-secondary border-b border-border md:hidden animate-fade-in">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search orders, users, operators..."
              className="w-full bg-control-bg/80 text-text-primary rounded-lg pl-9 pr-3 py-3 text-sm border border-white/10 focus:border-usdt-green focus:outline-none placeholder:text-text-tertiary"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
};
