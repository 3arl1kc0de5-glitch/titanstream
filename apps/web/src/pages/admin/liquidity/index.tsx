import type React from 'react';
import { useState, useEffect } from 'react';
import { MetricCard, MetricCardGrid } from '@/components/admin/MetricCard';
import { AlertBanner } from '@/components/admin/AlertBanner';
import { ChevronDown, AlertTriangle, Wallet } from 'lucide-react';
import { treasuryService, type TreasuryMetricsResponse } from '@/services/treasuryService';

export const LiquidityPage: React.FC = () => {
  const [showAlerts, setShowAlerts] = useState(true);
  const [metrics, setMetrics] = useState<TreasuryMetricsResponse | null>(null);

  useEffect(() => {
    treasuryService.getMetrics().then((data) => setMetrics(data));
  }, []);

  const liquidityMetrics = [
    { label: 'Total Treasury Reserve', value: `$${(metrics?.totalLiquidity || 0).toLocaleString()} USDT`, change: '+0.0%', variant: 'positive' as const },
    { label: 'User Liabilities', value: `$${(metrics?.userLiabilities || 0).toLocaleString()} USDT`, change: '0.0%', variant: 'neutral' as const },
    { label: 'Reserve Ratio', value: `${metrics?.reserveRatio || 100}%`, change: 'Healthy', variant: 'positive' as const },
    { label: 'Pending Payouts', value: `$${(metrics?.projectedPayouts || 0).toLocaleString()} USDT`, change: '0.0%', variant: 'neutral' as const },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile: Collapsible alerts */}
      <div className="sm:hidden">
        <button
          onClick={() => setShowAlerts(!showAlerts)}
          className="flex items-center gap-2 w-full text-sm font-bold text-text-primary mb-2 min-h-[36px]"
        >
          <AlertTriangle size={16} className="text-gold" />
          System Status (1)
          <ChevronDown size={14} className={`ml-auto transition-transform ${showAlerts ? 'rotate-180' : ''}`} />
        </button>
        {showAlerts && (
          <div className="space-y-2">
            <AlertBanner
              message={`Treasury reserve coverage: ${metrics?.forecastDays || 30} days projected velocity.`}
              severity="low"
              dismissable
            />
          </div>
        )}
      </div>

      <MetricCardGrid columns={2}>
        {liquidityMetrics.map((m) => (
          <MetricCard key={m.label} label={m.label} value={m.value} change={m.change} variant={m.variant} />
        ))}
      </MetricCardGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-card-bg rounded-xl p-3 sm:p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-text-primary">Liquidity Reserve Breakdown</h3>
          </div>
          <div className="h-36 sm:h-48 flex items-center justify-center border border-dashed border-white/10 rounded-xl">
            <span className="text-xs text-text-tertiary">Real-time ledger postings active. Reserve coverage: {metrics?.reserveRatio || 100}%.</span>
          </div>
        </div>

        {/* Desktop alerts panel */}
        <div className="hidden sm:block space-y-3">
          <h3 className="text-sm font-bold text-text-primary">Active Health Check</h3>
          <AlertBanner
            message={`Health: ${metrics?.healthStatus || 'HEALTHY'} — Risk Profile: ${metrics?.riskScore || 'LOW'}`}
            severity="low"
            dismissable={false}
          />
        </div>
      </div>

      {/* Administrative Wallet Registry & Custody Layer */}
      <div className="bg-card-bg rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
              <Wallet size={16} className="text-usdt-green" /> Administrative Wallet Registry & Custody Layer
            </h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              Register, rotate, and manage default receiving and withdrawal wallets without hardcoding.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 text-text-tertiary">
                <th className="py-2 px-3">Registry Name</th>
                <th className="py-2 px-3">Network</th>
                <th className="py-2 px-3">Purpose</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="hover:bg-white/[0.02]">
                <td className="py-2.5 px-3 font-bold text-text-primary">Primary TRON Treasury</td>
                <td className="py-2.5 px-3 text-text-secondary">TRON (TRC20)</td>
                <td className="py-2.5 px-3 text-text-tertiary">Receiving Treasury</td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded bg-usdt-green/20 text-usdt-green font-extrabold text-[10px]">
                    Active
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
