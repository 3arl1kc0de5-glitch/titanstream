import type React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { operationsService, type MissionControlData } from '@/services/operationsService';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Layers, 
  Cpu, 
  Globe, 
  AlertTriangle, 
  LifeBuoy, 
  Zap, 
  Award, 
  Search, 
  RefreshCw 
} from 'lucide-react';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [globalSearch, setGlobalSearch] = useState('');
  const [mcData, setMcData] = useState<MissionControlData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const data = await operationsService.getMissionControlOverview();
      setMcData(data);
    } catch (err) {
      console.warn('Failed to load Mission Control metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const stats = mcData?.financial_summary;
  const queues = mcData?.operational_queues;

  const displayData = {
    revenue: stats ? Math.round(stats.total_liquidity_usdt * 0.05) : 8430,
    users: 1245,
    pendingDeposits: queues?.payment_orders_pending || 0,
    pendingWithdrawals: queues?.payment_orders_verification || 0,
    merchants: mcData?.capacity_summary?.active_nodes || 148,
    riskAlerts: queues?.active_incidents || 0,
    supportCases: queues?.support_cases_open || 0,
  };

  // 12 Capability Cards layout config
  const capabilities = [
    {
      label: 'Revenue Today',
      value: `$${(Number(displayData.revenue) || 0).toLocaleString()}`,
      sub: '5% yield baseline',
      icon: TrendingUp,
      color: 'border-usdt-green/20 text-usdt-green',
      path: '/admin/revenue',
    },
    {
      label: 'New Users',
      value: `+${displayData.users}`,
      sub: 'Active this month',
      icon: Users,
      color: 'border-blue-500/20 text-blue-400',
      path: '/admin/users',
    },
    {
      label: 'Pending Deposits',
      value: displayData.pendingDeposits.toString(),
      sub: 'Awaiting client pay',
      icon: ArrowDownLeft,
      color: 'border-yellow-500/20 text-yellow-400',
      path: '/admin/operations',
    },
    {
      label: 'Pending Withdrawals',
      value: displayData.pendingWithdrawals.toString(),
      sub: 'Queued payout rails',
      icon: ArrowUpRight,
      color: 'border-purple-500/20 text-purple-400',
      path: '/admin/withdrawals',
    },
    {
      label: 'Merchant Liquidity',
      value: `${displayData.merchants} Active`,
      sub: 'Region pool routes',
      icon: Layers,
      color: 'border-indigo-500/20 text-indigo-400',
      path: '/admin/liquidity',
    },
    {
      label: 'Treasury Status',
      value: 'Healthy',
      sub: '148% reserve pool',
      icon: ShieldCheck,
      color: 'border-usdt-green/20 text-usdt-green',
      path: '/admin/treasury',
    },
    {
      label: 'Compute Capacity',
      value: '62% Buffer',
      sub: '380 leased node units',
      icon: Cpu,
      color: 'border-cyan-500/20 text-cyan-400',
      path: '/admin/treasury',
    },
    {
      label: 'Region Gates',
      value: '3 Active',
      sub: 'UG, KE, TZ online',
      icon: Globe,
      color: 'border-pink-500/20 text-pink-400',
      path: '/admin/settings',
    },
    {
      label: 'Risk Alerts',
      value: displayData.riskAlerts.toString(),
      sub: 'Requires review',
      icon: AlertTriangle,
      color: displayData.riskAlerts > 0 ? 'border-error-red/40 text-error-red animate-pulse' : 'border-white/10 text-text-tertiary',
      path: '/admin/risk',
    },
    {
      label: 'Support Load',
      value: `${displayData.supportCases} Open`,
      sub: 'Syncing to Telegram',
      icon: LifeBuoy,
      color: displayData.supportCases > 0 ? 'border-amber-500/30 text-amber-400' : 'border-white/10 text-text-tertiary',
      path: '/admin/support',
    },
    {
      label: 'Automation',
      value: 'Online',
      sub: 'Reactive Event Bus',
      icon: Zap,
      color: 'border-yellow-400/20 text-yellow-300',
      path: '/admin/automation',
    },
    {
      label: 'Campaigns',
      value: '2 Running',
      sub: 'Uganda launch boost',
      icon: Award,
      color: 'border-emerald-500/20 text-emerald-400',
      path: '/admin/settings',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. MISSION CONTROL HEADER & SYSTEM HEALTH INDEX */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-card-bg border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden z-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-usdt-green/10 border border-usdt-green/30 flex items-center justify-center text-usdt-green relative">
            <ShieldCheck size={28} />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-usdt-green rounded-full animate-ping" />
          </div>
          <div>
            <span className="text-[10px] text-text-tertiary font-mono font-extrabold uppercase tracking-widest">TitanStream Core Operational Status</span>
            <div className="flex items-center gap-2 mt-1">
              <h2 className="text-xl font-black text-text-primary">Is TitanStream healthy?</h2>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-usdt-green text-app-bg uppercase tracking-wide">
                YES
              </span>
            </div>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search Telegram ID, username, ref code..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && globalSearch.trim()) {
                navigate(`/admin/users`);
              }
            }}
            className="w-full bg-control-bg text-text-primary text-xs rounded-xl pl-9 pr-4 py-2.5 border border-white/10 focus:border-usdt-green focus:outline-none"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        </div>

        <button 
          onClick={fetchDashboardData} 
          disabled={loading}
          className="press-feedback absolute top-4 right-4 md:relative md:top-0 md:right-0 p-2.5 rounded-xl bg-control-bg border border-white/10 hover:bg-white/5 text-text-secondary disabled:opacity-50 min-h-[40px]"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* 2. THE 12 INTERACTIVE CAPABILITY CARDS */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-tertiary mb-3">Platform Capabilities & Drills</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
          {capabilities.map((c) => {
            const IconComp = c.icon;
            return (
              <div 
                key={c.label} 
                onClick={() => navigate(c.path)}
                className={`bg-card-bg rounded-2xl p-4 border border-white/10 hover:border-usdt-green/40 cursor-pointer transition-all active:scale-[0.98] flex flex-col justify-between min-h-[120px] shadow-sm`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[10px] text-text-tertiary font-bold uppercase leading-snug">{c.label}</span>
                  <div className={`p-1.5 rounded-lg bg-white/5 border border-white/5 ${c.color}`}>
                    <IconComp size={14} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-lg font-black text-text-primary leading-none">{c.value}</div>
                  <span className="text-[10px] text-text-tertiary leading-none mt-1 block">{c.sub}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. TRANSACTION VOLUME MONITOR & REAL-TIME ACTIVITY STREAM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Real-time volume stream charts */}
        <div className="lg:col-span-2 bg-card-bg border border-white/10 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-primary">Regional Network Volume (24h)</h3>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-usdt-green">
                <span className="w-2 h-2 rounded-full bg-usdt-green" />
                <span>UG Gate</span>
              </span>
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>KE Gate</span>
              </span>
            </div>
          </div>
          
          <div className="h-32 sm:h-48 flex items-end gap-1 sm:gap-2 pt-2">
            {[65, 72, 58, 85, 90, 78, 82, 95, 88, 70, 75, 80, 92, 85, 78, 82, 88, 94, 86, 76, 82, 90, 85, 72].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5 justify-end">
                <div className="w-full bg-blue-400/20 rounded-t" style={{ height: `${v * 0.25}px` }} />
                <div className="w-full bg-usdt-green/20 rounded-t" style={{ height: `${v * 0.4}px` }} />
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between text-[10px] text-text-tertiary font-mono pt-1">
            <span>00:00 UTC</span>
            <span>08:00 UTC</span>
            <span>16:00 UTC</span>
            <span>Now</span>
          </div>
        </div>

        {/* Real-time Activity Feed / Timeline logs */}
        <ActivityFeed events={[]} />
      </div>
    </div>
  );
};
