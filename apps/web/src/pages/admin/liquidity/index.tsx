import type React from 'react';
import { useState } from 'react';
import { MetricCard, MetricCardGrid } from '@/components/admin/MetricCard';
import { AlertBanner } from '@/components/admin/AlertBanner';
import { liquidityMetrics, liquidityChartData, liquidityAlerts } from '@/data/mock/liquidity';
import { ChevronDown, TrendingUp, AlertTriangle, Wallet } from 'lucide-react';

export const LiquidityPage: React.FC = () => {
  const [showAlerts, setShowAlerts] = useState(true);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile: Collapsible alerts */}
      <div className="sm:hidden">
        <button
          onClick={() => setShowAlerts(!showAlerts)}
          className="flex items-center gap-2 w-full text-sm font-bold text-text-primary mb-2 min-h-[36px]"
        >
          <AlertTriangle size={16} className="text-gold" />
          Active Alerts ({liquidityAlerts.length})
          <ChevronDown size={14} className={`ml-auto transition-transform ${showAlerts ? 'rotate-180' : ''}`} />
        </button>
        {showAlerts && (
          <div className="space-y-2">
            {liquidityAlerts.map((alert) => (
              <AlertBanner
                key={alert.id}
                message={alert.message}
                severity={alert.severity === 'high' ? 'high' : alert.severity === 'medium' ? 'medium' : 'low'}
                dismissable
              />
            ))}
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
            <h3 className="text-sm font-bold text-text-primary">Liquidity Distribution</h3>
            <div className="flex items-center gap-2 sm:gap-3 text-xs">
              {['Internal', 'Merchant', 'Reserved'].map((label, i) => (
                <span key={label} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${['bg-usdt-green', 'bg-gold', 'bg-ton-blue'][i]}`} />
                  <span className="hidden sm:inline">{label}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="h-36 sm:h-48 flex items-end gap-1 sm:gap-2">
            {liquidityChartData.map((point, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
                <div className="w-full bg-ton-blue/20 rounded-t" style={{ height: `${point.reserved * 30}px` }} />
                <div className="w-full bg-gold/20 rounded-t" style={{ height: `${point.merchant * 12}px` }} />
                <div className="w-full bg-usdt-green/20 rounded-t" style={{ height: `${point.internal * 10}px` }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] sm:text-xs text-text-tertiary">
            {liquidityChartData.map((p) => <span key={p.time}>{p.time}</span>)}
          </div>
        </div>

        {/* Desktop alerts panel */}
        <div className="hidden sm:block space-y-3">
          <h3 className="text-sm font-bold text-text-primary">Active Alerts</h3>
          {liquidityAlerts.map((alert) => (
            <AlertBanner
              key={alert.id}
              message={alert.message}
              severity={alert.severity === 'high' ? 'high' : alert.severity === 'medium' ? 'medium' : 'low'}
              dismissable={false}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card-bg rounded-xl p-3 sm:p-4">
          <h4 className="text-sm font-bold text-text-primary mb-3">Reserve Health</h4>
          <div className="space-y-3">
            {[
              { label: 'USDT (TRC-20)', percentage: 72, color: 'bg-usdt-green' },
              { label: 'USDT (ERC-20)', percentage: 45, color: 'bg-ton-blue' },
              { label: 'BTC', percentage: 88, color: 'bg-gold' },
              { label: 'TON', percentage: 30, color: 'bg-ton-blue' },
            ].map((r) => (
              <div key={r.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-primary">{r.label}</span>
                  <span className="text-text-tertiary">{r.percentage}%</span>
                </div>
                <div className="h-2 sm:h-2.5 bg-control-bg rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${r.color}`} style={{ width: `${r.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card-bg rounded-xl p-3 sm:p-4">
          <h4 className="text-sm font-bold text-text-primary mb-3">Exposure by Asset</h4>
          <div className="space-y-3">
            {[
              { asset: 'USDT', exposure: '$5.2M', limit: '$10M', percentage: 52 },
              { asset: 'BTC', exposure: '$2.8M', limit: '$5M', percentage: 56 },
              { asset: 'TON', exposure: '$0.8M', limit: '$2M', percentage: 40 },
            ].map((e) => (
              <div key={e.asset}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-primary">{e.asset}</span>
                  <span className="text-text-tertiary">{e.exposure} / {e.limit}</span>
                </div>
                <div className="h-2 sm:h-2.5 bg-control-bg rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${e.percentage > 50 ? 'bg-gold' : 'bg-usdt-green'}`} style={{ width: `${e.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
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
          <button
            onClick={() => {
              const name = prompt('Wallet Registry Name (e.g. TRON Reserve Pool):');
              if (!name) return;
              const addr = prompt('Blockchain Address:');
              if (!addr) return;
              alert(`Registered wallet "${name}" (${addr.slice(0, 8)}...) to administrative registry!`);
            }}
            className="px-3 py-1.5 rounded-xl bg-usdt-green text-app-bg font-extrabold text-xs shadow-md"
          >
            + Register Wallet
          </button>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 text-text-tertiary">
                <th className="py-2 px-3">Registry Name</th>
                <th className="py-2 px-3">Network</th>
                <th className="py-2 px-3">Purpose</th>
                <th className="py-2 px-3">Address</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3 text-right">Default Routing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                { name: 'Primary TRON Treasury', chain: 'TRON (TRC20)', purpose: 'Receiving Treasury', addr: 'TQj81n92K...881a', status: 'Active', isDefaultRec: true, isDefaultWith: true },
                { name: 'Ethereum Reserve Vault', chain: 'Ethereum (ERC20)', purpose: 'Cold Reserve', addr: '0x71C928...44a1', status: 'Active', isDefaultRec: false, isDefaultWith: false },
                { name: 'Instant Payout Hot Pool', chain: 'TRON (TRC20)', purpose: 'Withdrawal Liquidity', addr: 'TKh92a88...192b', status: 'Active', isDefaultRec: false, isDefaultWith: true },
              ].map((w, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02]">
                  <td className="py-2.5 px-3 font-bold text-text-primary">{w.name}</td>
                  <td className="py-2.5 px-3 text-text-secondary">{w.chain}</td>
                  <td className="py-2.5 px-3 text-text-tertiary">{w.purpose}</td>
                  <td className="py-2.5 px-3 text-usdt-green">{w.addr}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-usdt-green/20 text-usdt-green font-extrabold text-[10px]">
                      {w.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {w.isDefaultRec && <span className="mr-1 px-2 py-0.5 rounded bg-gold/20 text-gold text-[9px] font-bold">DEFAULT RECEIVING</span>}
                    {w.isDefaultWith && <span className="px-2 py-0.5 rounded bg-ton-blue/20 text-ton-blue text-[9px] font-bold">DEFAULT WITHDRAWAL</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
