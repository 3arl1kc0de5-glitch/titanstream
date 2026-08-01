import type React from 'react';
import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { treasuryOperatorService, type TreasuryOperatorProfile } from '@/services/treasuryOperatorService';
import { type PaymentOrderRecord } from '@/services/paymentOrderService';
import { WalletSummary, type Wallet } from '@/components/admin/WalletSummary';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { MetricCard, MetricCardGrid } from '@/components/admin/MetricCard';
import { ChevronDown, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2, XCircle, UserCheck } from 'lucide-react';
import { showToast } from '@/components/Toast';

interface TreasuryMetrics {
  totalLiquidity: number;
  userLiabilities: number;
  reserveRatio: number;
  projectedPayouts: number;
  settlementExposure: number;
  capacityRemaining: number;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  riskScore: 'LOW' | 'MEDIUM' | 'HIGH';
  forecastDays: number;
  countryAllocation: Record<string, number>;
}

const statusColors = {
  HEALTHY: 'text-usdt-green bg-usdt-green/10 border-usdt-green/20',
  DEGRADED: 'text-gold bg-gold/10 border-gold/20',
  CRITICAL: 'text-error-red bg-error-red/10 border-error-red/20',
};

export const TreasuryPage: React.FC = () => {
  const [selected, setSelected] = useState<Wallet | null>(null);
  const [metrics, setMetrics] = useState<TreasuryMetrics | null>(null);
  const [roster, setRoster] = useState<TreasuryOperatorProfile[]>([]);
  const [verificationQueue, setVerificationQueue] = useState<PaymentOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTreasuryData = async () => {
    setLoading(true);
    try {
      const [healthRes, rosterData, queueData] = await Promise.all([
        api.get('/admin/treasury/health').catch(() => ({ data: null })),
        treasuryOperatorService.getRoster().catch(() => []),
        treasuryOperatorService.getQueue().catch(() => []),
      ]);

      if (healthRes.data) setMetrics(healthRes.data);
      setRoster(rosterData);
      setVerificationQueue(queueData);
    } catch (err) {
      console.warn('Failed to load real-time treasury metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreasuryData();
  }, []);

  const handleApproveOrder = async (orderId: string) => {
    try {
      await treasuryOperatorService.verifyPaymentOrder(orderId, 'APPROVE');
      showToast(`Payment Order verified & accredited to double-entry ledger!`, 'success');
      fetchTreasuryData();
    } catch (err: any) {
      showToast(err?.message || 'Verification approval failed', 'error');
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    try {
      await treasuryOperatorService.verifyPaymentOrder(orderId, 'REJECT', 'Operator rejected verification');
      showToast(`Payment Order rejected`, 'warning');
      fetchTreasuryData();
    } catch (err: any) {
      showToast(err?.message || 'Rejection failed', 'error');
    }
  };

  const displayMetrics: TreasuryMetrics = metrics || {
    totalLiquidity: 0,
    userLiabilities: 0,
    reserveRatio: 100,
    projectedPayouts: 0,
    settlementExposure: 0,
    capacityRemaining: 100,
    healthStatus: 'HEALTHY',
    riskScore: 'LOW',
    forecastDays: 30,
    countryAllocation: {},
  };

  return (
    <div className="space-y-6">
      {/* Treasury Header and Health Index Indicator */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-card-bg border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden z-10">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
            displayMetrics.healthStatus === 'HEALTHY' ? 'border-usdt-green bg-usdt-green/10 text-usdt-green' : 'border-gold bg-gold/10 text-gold'
          }`}>
            {displayMetrics.healthStatus === 'HEALTHY' ? <ShieldCheck size={24} /> : <AlertCircle size={24} />}
          </div>
          <div>
            <span className="text-xs text-text-tertiary font-bold uppercase tracking-wider">Treasury Operations HQ</span>
            <div className="flex items-center gap-2 mt-0.5">
              <h3 className="text-lg font-extrabold text-text-primary">TitanStream Escrow Engine</h3>
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${statusColors[displayMetrics.healthStatus]}`}>
                {displayMetrics.healthStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Dashboard parameters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto text-left">
          <div className="px-3 py-1 bg-white/5 rounded-xl border border-white/5">
            <span className="text-[10px] text-text-tertiary uppercase font-bold">Reserve Ratio</span>
            <p className="text-sm font-extrabold text-usdt-green">{displayMetrics.reserveRatio}%</p>
          </div>
          <div className="px-3 py-1 bg-white/5 rounded-xl border border-white/5">
            <span className="text-[10px] text-text-tertiary uppercase font-bold">Risk Profile</span>
            <p className="text-sm font-extrabold text-text-primary">{displayMetrics.riskScore}</p>
          </div>
          <div className="px-3 py-1 bg-white/5 rounded-xl border border-white/5">
            <span className="text-[10px] text-text-tertiary uppercase font-bold">Compute Capacity</span>
            <p className="text-sm font-extrabold text-text-primary">{displayMetrics.capacityRemaining}%</p>
          </div>
          <div className="px-3 py-1 bg-white/5 rounded-xl border border-white/5">
            <span className="text-[10px] text-text-tertiary uppercase font-bold">Pending Orders</span>
            <p className="text-sm font-extrabold text-gold">{verificationQueue.length}</p>
          </div>
        </div>

        <button 
          onClick={fetchTreasuryData} 
          disabled={loading}
          className="press-feedback absolute top-4 right-4 md:relative md:top-0 md:right-0 p-2.5 rounded-xl bg-control-bg border border-white/10 hover:bg-white/5 text-text-secondary disabled:opacity-50 min-h-[40px] cursor-pointer"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Treasury Duty Operators Roster & Verification Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Duty Roster */}
        <div className="bg-card-bg border border-white/10 rounded-2xl p-4 space-y-3">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-primary flex items-center gap-2">
            <UserCheck size={16} className="text-usdt-green" /> Duty Operators Roster
          </h4>
          <div className="space-y-2">
            {roster.map((op) => (
              <div key={op.id} className="p-3 rounded-xl bg-control-bg/60 border border-white/5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-extrabold text-text-primary">{op.name}</div>
                  <div className="text-[10px] text-text-tertiary">{op.role} · Scope: {op.countryScope}</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  op.dutyStatus === 'ACTIVE' ? 'bg-usdt-green/20 text-usdt-green border border-usdt-green/30' : 'bg-white/10 text-text-tertiary'
                }`}>
                  {op.dutyStatus}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Pending Verification Workstation Queue (2 columns wide) */}
        <div className="lg:col-span-2 bg-card-bg border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-primary flex items-center gap-2">
              <CheckCircle2 size={16} className="text-usdt-green" /> Verification Workstation ({verificationQueue.length})
            </h4>
            <span className="text-[10px] text-text-tertiary">Requires single-click double-entry ledger accreditation</span>
          </div>

          <div className="space-y-3">
            {verificationQueue.map((order) => (
              <div key={order.id} className="p-3.5 rounded-xl bg-control-bg border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-sm text-text-primary">{order.reference}</span>
                    <span className="px-2 py-0.5 rounded bg-usdt-green/15 text-usdt-green font-bold text-[10px]">
                      ${(Number(order?.amount) || 0).toFixed(2)} USDT ({(Number(order?.localAmount) || 0).toLocaleString()} {order.currency})
                    </span>
                    <span className="text-[10px] text-text-tertiary font-mono">[{order.status}]</span>
                  </div>
                  <div className="text-xs text-text-secondary">
                    Receiving USSD: <code className="font-mono text-usdt-green font-bold">{order.ussdCode}</code>
                  </div>
                  <div className="text-[10px] text-text-tertiary">
                    User: {order.telegramUserId} | Method: {order.paymentMethod} ({order.network})
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => handleRejectOrder(order.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-1 press-feedback cursor-pointer"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                  <button
                    onClick={() => handleApproveOrder(order.id)}
                    className="px-3.5 py-1.5 rounded-lg bg-usdt-green text-app-bg text-xs font-extrabold flex items-center gap-1 shadow-md press-feedback cursor-pointer"
                  >
                    <CheckCircle2 size={14} /> Verify & Post Ledger
                  </button>
                </div>
              </div>
            ))}
            {verificationQueue.length === 0 && (
              <div className="text-center py-8 text-xs text-text-tertiary">
                🟢 Verification queue clear — No pending USSD or CryptoBot deposit orders awaiting operator action.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Core Balances Grid */}
      <MetricCardGrid columns={2}>
        <MetricCard label="System Reserves" value={`$${(Number(displayMetrics.totalLiquidity) || 0).toLocaleString()}`} change={1.2} icon="Wallet" variant="green" />
        <MetricCard label="Customer Liabilities" value={`$${(Number(displayMetrics.userLiabilities) || 0).toLocaleString()}`} change={2.1} icon="DollarSign" variant="blue" />
        <MetricCard label="Active Exposure" value={`$${(Number(displayMetrics.settlementExposure) || 0).toLocaleString()}`} change={-0.5} icon="Shield" variant="gold" />
        <MetricCard label="Projected Payouts" value={`$${(Number(displayMetrics.projectedPayouts) || 0).toLocaleString()}`} change={5.3} icon="Clock" variant="default" />
      </MetricCardGrid>
    </div>
  );
};
