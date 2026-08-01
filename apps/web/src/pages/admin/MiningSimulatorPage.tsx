import React, { useState } from 'react';
import { useMiningStore } from '../../store/useMiningStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useCountryStore } from '../../store/useCountryStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { 
  Play, Pause, Zap, RefreshCw, Database, DollarSign, 
  TrendingUp, Award, Thermometer, ShieldAlert, CheckCircle2, 
  Coins, ArrowRightLeft, Clock
} from 'lucide-react';
import { showToast } from '../../components/Toast';

interface LedgerLog {
  timestamp: string;
  type: string;
  asset: string;
  amount: string;
  debitAccount: string;
  creditAccount: string;
  reference: string;
}

export const MiningSimulatorPage: React.FC = () => {
  const { 
    activeCurrency, 
    baseSpeedGhs, 
    coolerMultiplier, 
    maxMultiplier,
    isOverheated,
    cooldownRemaining,
    unclaimedBalance,
    lifetimePromotionalOutput,
    machineMode,
    isMiningLocked,
    tap,
    claimMinedYield,
    fetchMiningState
  } = useMiningStore();

  const { usdtBalance, tonBalance } = useWalletStore();
  const { selectedCountry } = useCountryStore();
  const { preferLocalCurrency } = useSettingsStore();

  const [ledgerLogs, setLedgerLogs] = useState<LedgerLog[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Active state calculations
  const safeUnclaimed = Number(unclaimedBalance) || 0;
  const isLocked = isMiningLocked();

  // Handle mock time fast-forward (admin-only simulation; the live backend
  // remains the authoritative source and reconciles on the next sync)
  const fastForward = (hours: number) => {
    const s = useMiningStore.getState();
    const rate = 0.00000289; // TS_TRIAL promotional rate
    const baseYieldRatePerSec = rate * 10;
    const seconds = hours * 3600;
    let accrued = s.baseSpeedGhs * s.coolerMultiplier * baseYieldRatePerSec * seconds;

    let promo = s.lifetimePromotionalOutput;
    let mode = s.machineMode;
    if (mode === 'PROMOTIONAL') {
      const remainingCap = Math.max(0, 5.0 - promo);
      if (accrued >= remainingCap) {
        accrued = remainingCap;
        promo = 5.0;
        mode = 'STANDARD';
      } else {
        promo += accrued;
      }
    }

    useMiningStore.setState({
      unclaimedBalance: s.unclaimedBalance + accrued,
      lifetimePromotionalOutput: promo,
      machineMode: mode,
    });

    showToast(`Simulated time advanced by +${hours} hours. Accrued +${accrued.toFixed(4)} ${activeCurrency}.`, 'success');
  };

  // Simulate server crash / re-login
  const handleSimulateRelogin = async () => {
    setIsSyncing(true);
    showToast('Simulating logout & cache flush...', 'info');
    
    // Clear only local memory state (keep backend session to simulate DB restoration)
    useMiningStore.setState({
      unclaimedBalance: 0.0,
      coolerMultiplier: 1.0,
      isOverheated: false,
      cooldownRemaining: 0
    });

    setTimeout(async () => {
      await fetchMiningState();
      setIsSyncing(false);
      showToast('Session successfully restored from backend Database!', 'success');
    }, 1200);
  };

  // Handle claim
  const handleClaimSubmit = async () => {
    if (safeUnclaimed <= 0) return;
    setIsSyncing(true);
    const prevUnclaimed = safeUnclaimed;
    const success = await claimMinedYield();
    setIsSyncing(false);

    if (success) {
      // Log the double-entry posting locally for visualization
      const reference = `mining_claim_${Date.now().toString().slice(-6)}`;
      const newLog: LedgerLog = {
        timestamp: new Date().toLocaleTimeString(),
        type: 'SYSTEM_ALLOCATION',
        asset: activeCurrency,
        amount: prevUnclaimed.toFixed(6),
        debitAccount: 'PLATFORM_RESERVE',
        creditAccount: 'USER_ASSET_LIABILITY',
        reference
      };
      setLedgerLogs((prev) => [newLog, ...prev]);
      showToast(`Claim successful! +${prevUnclaimed.toFixed(4)} ${activeCurrency} credited.`, 'success');
    } else {
      showToast('Claim failed. Please try again.', 'error');
    }
  };

  // Calibration helper
  const trialProgressPercent = Math.min(100, (lifetimePromotionalOutput / 5.0) * 100);

  return (
    <div className="p-6 bg-slate-950 text-slate-100 min-h-screen space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Zap className="text-emerald-400 animate-pulse" size={26} />
            Unified Mining Engine Simulator
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Observe, simulate, and audit the state-driven lifecycle of the Free Trial and Premium machines.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSimulateRelogin}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold border border-slate-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            Simulate Re-login
          </button>
        </div>
      </div>

      {/* Grid status cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Unclaimed Balance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-emerald-500/10 text-emerald-400 p-2 rounded-lg">
            <Coins size={20} />
          </div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unclaimed Balance</div>
          <div className="text-2xl font-bold mt-2 font-mono text-white">
            {safeUnclaimed.toFixed(6)} <span className="text-sm text-slate-400 font-sans">{activeCurrency}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Accruing live in memory & DB</div>
        </div>

        {/* Multiplier / Temp */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-amber-500/10 text-amber-400 p-2 rounded-lg">
            <Thermometer size={20} />
          </div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Core Temperature</div>
          <div className="text-2xl font-bold mt-2 font-mono text-white">
            {(30 + (coolerMultiplier - 1.0) * 3.2).toFixed(1)}°C
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Multiplier: <span className="text-amber-400 font-bold">×{coolerMultiplier.toFixed(1)}</span>
          </div>
        </div>

        {/* Earning Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-blue-500/10 text-blue-400 p-2 rounded-lg">
            <TrendingUp size={20} />
          </div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Earning Status</div>
          <div className="text-2xl font-bold mt-2 text-white">
            {isLocked ? (
              <span className="text-rose-400 flex items-center gap-1.5 text-lg">
                <ShieldAlert size={18} /> CAPPED / EXPIRED
              </span>
            ) : isOverheated ? (
              <span className="text-amber-400 flex items-center gap-1.5 text-lg">
                <RefreshCw size={18} className="animate-spin" /> COOLING DOWN ({cooldownRemaining}s)
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1.5 text-lg">
                <Play size={18} className="fill-emerald-400" /> ACTIVE & MINING
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Speed: {baseSpeedGhs.toFixed(1)} GH/s ({baseSpeedGhs * 10} CU)
          </div>
        </div>

        {/* Wallet Balances */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-4 right-4 bg-indigo-500/10 text-indigo-400 p-2 rounded-lg">
            <DollarSign size={20} />
          </div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Wallet Balance</div>
          <div className="text-2xl font-bold mt-2 font-mono text-white">
            {activeCurrency === 'USDT' ? `${usdtBalance.toFixed(4)} USDT` : `${tonBalance.toFixed(4)} TON`}
          </div>
          <div className="text-xs text-slate-500 mt-1">Real-time ledger value</div>
        </div>
      </div>

      {/* Main Sandbox Interactive Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Interactive Controls & Trial Calibration */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Simulator Actions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Play size={18} className="text-emerald-400" />
              Time Machine & Simulation Controls
            </h3>
            <p className="text-sm text-slate-400 mb-5">
              Advance time instantly to test passive accumulation, earning caps, and expiration behavior.
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button 
                onClick={() => fastForward(1)}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-transform rounded-xl border border-slate-700 text-center font-bold text-white flex flex-col items-center justify-center gap-1"
              >
                <Clock size={16} />
                <span>+1 Hour</span>
              </button>
              <button 
                onClick={() => fastForward(12)}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-transform rounded-xl border border-slate-700 text-center font-bold text-white flex flex-col items-center justify-center gap-1"
              >
                <Clock size={16} />
                <span>+12 Hours</span>
              </button>
              <button 
                onClick={() => fastForward(24)}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-transform rounded-xl border border-slate-700 text-center font-bold text-white flex flex-col items-center justify-center gap-1"
              >
                <Clock size={16} />
                <span>+24 Hours</span>
              </button>
              <button 
                onClick={() => fastForward(48)}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-transform rounded-xl border border-slate-700 text-center font-bold text-white flex flex-col items-center justify-center gap-1"
              >
                <Clock size={16} />
                <span>+48 Hours</span>
              </button>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={(e) => {
                  tap();
                  // Simulate click feedback
                  const rect = e.currentTarget.getBoundingClientRect();
                  showToast('Tapped core! Multiplier and temperature increased.', 'success');
                }}
                disabled={isLocked || isOverheated}
                className="flex-1 px-5 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-slate-800 disabled:to-slate-850 disabled:opacity-50 text-slate-950 font-black text-center rounded-xl shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2"
              >
                <Zap size={18} />
                TAP TITAN CORE (+0.6× Multiplier)
              </button>

              <button
                onClick={handleClaimSubmit}
                disabled={isSyncing || safeUnclaimed <= 0}
                className="px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 disabled:from-slate-800 disabled:to-slate-850 disabled:opacity-40 disabled:text-slate-500 text-white font-black text-center rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Coins size={18} />
                RECEIVE STREAM OUTPUT
              </button>
            </div>
          </div>

          {/* Titan Core Calibration & Lifecycle Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Award size={18} className="text-indigo-400" />
              Titan Core Calibration & Lifecycle
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              The Titan Core is a <strong className="text-slate-200">permanent machine</strong>. It produces at the
              Promotional rate until it generates <strong className="text-slate-200">$5.00 lifetime promotional output</strong>,
              then automatically continues forever in <strong className="text-slate-200">Standard Mode</strong> at a slower
              configured rate. It never expires and never locks permanently.
            </p>

            <div className="space-y-5">
              {/* Promotional Output Progress */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="text-slate-400">Lifetime Promotional Output</span>
                  <span className="text-white font-mono">{lifetimePromotionalOutput.toFixed(4)} / 5.0000 USDT</span>
                </div>
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                    style={{ width: `${trialProgressPercent}%` }}
                  />
                </div>
              </div>

              {/* Operating Mode */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="text-slate-400">Operating Mode</span>
                  <span className={`font-mono ${machineMode === 'PROMOTIONAL' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {machineMode === 'PROMOTIONAL' ? 'PROMOTIONAL (fast)' : 'STANDARD (permanent)'}
                  </span>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-slate-400">
                  <Database size={18} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-200">How it is Calibrated:</strong> The Titan Core has a promotional
                    yield rate of <code className="text-emerald-400 font-mono">0.00000289</code> USDT per 100ms
                    (~0.104 USDT/hour at ×1.0). Tapping increases the cooler multiplier, accelerating output until the
                    <code className="text-amber-400 font-mono"> $5.00 </code> lifetime cap is reached, at which point the
                    engine automatically transitions to Standard Mode (~600 days to $100 at ×1.0). All state — including
                    the multiplier and unclaimed output — is persisted server-side and restored on re-login.
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Real-time Double-Entry Audit Log */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col h-full">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <ArrowRightLeft size={18} className="text-indigo-400" />
            Double-Entry Ledger Audit Log
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Real-time audit log of double-entry ledger postings created by claim operations.
          </p>

          <div className="flex-1 overflow-y-auto space-y-3.5 max-h-[380px] pr-2">
            {ledgerLogs.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <Database size={24} className="mb-2 opacity-40" />
                <span className="text-xs">No claim transactions recorded yet</span>
              </div>
            ) : (
              ledgerLogs.map((log, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="font-semibold text-emerald-400">{log.type}</span>
                    <span>{log.timestamp}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Amount:</span>
                    <span className="font-mono font-bold text-white">+{log.amount} {log.asset}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[10px] font-mono">
                    <div>
                      <span className="text-slate-500 block">DEBIT</span>
                      <span className="text-rose-400 font-bold">{log.debitAccount}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block">CREDIT</span>
                      <span className="text-emerald-400 font-bold">{log.creditAccount}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Ref: <span className="text-slate-400">{log.reference}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Powered by FinancialOrchestrator</span>
            <span className="flex items-center gap-1 text-emerald-500 font-bold">
              <CheckCircle2 size={10} /> Sync Active
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
