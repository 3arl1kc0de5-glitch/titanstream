import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Vault,
  ShieldCheck,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Info,
  Unlock,
  Calendar,
  Activity,
  Globe,
  Loader2
} from 'lucide-react';
import { useTreasuryStore } from '../../store/useTreasuryStore';
import type { MissionItem, CycleStatus } from '../../store/useTreasuryStore';
import { useNavigationStore } from '../../store/useNavigationStore';
import { useMiningStore } from '../../store/useMiningStore';
import { useWalletStore } from '../../store/useWalletStore';
import { showToast } from '../../components/Toast';
import { CapacityEngine } from './components/CapacityEngine';

export const TreasuryScreen: React.FC = () => {
  const {
    cycleStatus,
    dailyBoostActive,
    powerEarnedToday,
    reputationPower,
    trustScore,
    reputationRank,
    treasuryToday,
    depositsToday,
    withdrawalsToday,
    operatorVolume,
    topGrowth,
    seasonNumber,
    seasonTitle,
    daysRemaining,
    seasonTargetPower,
    seasonProgressPower,
    missions,
    events,
    fetchTreasuryState,
    takeSnapshot,
    claimMissionReward,
    calculateGrowthShare,
    startNewDay,
    resetSeason,
  } = useTreasuryStore();

  const { setActiveTab } = useNavigationStore();
  const { baseSpeedGhs } = useMiningStore();

  // Modals state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('100');

  // Snapshot scanning simulation state
  const [isScanning, setIsScanning] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  // Fetch real treasury state from backend on mount
  useEffect(() => {
    fetchTreasuryState();
  }, [fetchTreasuryState]);

  const handleCaptureSnapshot = () => {
    setIsScanning(true);
    showToast('Initiating global treasury ledger scan...', 'info');
    takeSnapshot();
    setTimeout(() => {
      setIsScanning(false);
      showToast('Treasury snapshot captured! 5 Daily opportunities unlocked.', 'success');
    }, 1200);
  };

  const handleCalculateGrowth = () => {
    setIsCalculating(true);
    showToast('Calculating user reputation yield...', 'info');
    calculateGrowthShare();
    setTimeout(() => {
      setIsCalculating(false);
      showToast('Daily treasury yield calculated! Tomorrow is unlocked.', 'success');
    }, 1500);
  };

  const handleDepositSubmit = () => {
    const depVal = parseFloat(depositAmount);
    if (!depositAmount || depVal <= 0) {
      showToast('Please enter a valid deposit amount', 'error');
      return;
    }
    useTreasuryStore.getState().incrementMissionProgress('DEPOSIT', 1);

    // Credit user wallet balance
    const wallet = useWalletStore.getState();
    useWalletStore.getState().updateBalance({ usdtBalance: wallet.usdtBalance + depVal });

    // Update global treasury pool statistics
    useTreasuryStore.getState().adjustTreasuryStats('DEPOSIT', depVal);

    // Boost trust score by +3 for deposit
    useTreasuryStore.getState().adjustTrustScore(3);

    setShowDepositModal(false);
    showToast(`Successfully deposited ${(Number(depVal) || 0).toFixed(2)} USDT! 1.5× Mining Speed Boost activated.`, 'success');
  };

  const handleMissionAction = (mission: MissionItem) => {
    switch (mission.type) {
      case 'DEPOSIT':
        setShowDepositModal(true);
        break;
      case 'REFER':
        setActiveTab('friends');
        break;
      case 'STAY_ACTIVE':
        showToast('Stay active streak is evaluated automatically daily.', 'info');
        break;
      default:
        break;
    }
  };

  return (
    <div className="p-4 flex flex-col gap-5 select-none relative pb-10">
      
      {/* 1. REPUTATION HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="web3-card rounded-2xl p-4 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-usdt-green/5 rounded-full blur-xl pointer-events-none" />
        
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-usdt-green/10 border border-usdt-green/30 flex items-center justify-center text-usdt-green">
              <Vault size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] text-text-tertiary uppercase font-extrabold tracking-widest leading-none">REPUTATION RANK</div>
              <div className="text-base font-black text-text-primary mt-0.5 flex items-center gap-1.5">
                {reputationRank}
                <span className="text-xs font-mono font-bold text-usdt-green bg-usdt-green/10 border border-usdt-green/20 px-2 py-0.5 rounded-full">
                  Lvl {reputationRank === 'Builder' ? 1 : reputationRank === 'Guardian' ? 2 : reputationRank === 'Architect' ? 3 : 4}
                </span>
                {dailyBoostActive && (
                  <span className="text-[9px] font-bold text-usdt-green bg-usdt-green/15 border border-usdt-green/30 px-2 py-0.5 rounded-full flex items-center gap-0.5 animate-pulse">
                    ⚡ 1.5x Boost
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-[10px] text-text-tertiary uppercase font-extrabold tracking-widest leading-none">TRUST SCORE</div>
            <div className="text-base font-black text-usdt-green font-mono mt-0.5 flex items-center gap-1 justify-end">
              <ShieldCheck size={16} />
              {trustScore}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3 pt-1 text-center">
          <div className="bg-control-bg/40 p-2 rounded-xl border border-white/5">
            <div className="text-[9px] text-text-secondary uppercase font-extrabold">Compute Speed</div>
            <div className="text-sm font-black text-text-primary font-mono mt-0.5">
              {((Number(baseSpeedGhs || 0) * (dailyBoostActive ? 1.5 : 1.0)) * 10).toFixed(0)} CU
            </div>
          </div>
          <div className="bg-control-bg/40 p-2 rounded-xl border border-white/5">
            <div className="text-[9px] text-text-secondary uppercase font-extrabold">Active Power</div>
            <div className="text-sm font-black text-text-primary font-mono mt-0.5">{reputationPower}</div>
            <div className="text-[8px] text-usdt-green font-mono font-bold">+{powerEarnedToday} Today</div>
          </div>
          <div className="bg-control-bg/40 p-2 rounded-xl border border-white/5">
            <div className="text-[9px] text-text-secondary uppercase font-extrabold">Trust Score</div>
            <div className="text-xs font-black mt-1 uppercase text-usdt-green flex items-center justify-center gap-0.5">
              <ShieldCheck size={10} /> {trustScore}%
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. DYNAMIC TICKING ECONOMY STATUS */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="web3-card rounded-2xl p-4 relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Activity size={15} className="text-usdt-green" />
            <h2 className="text-xs font-black uppercase text-text-primary tracking-widest">Live Platform Economy</h2>
          </div>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-usdt-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-usdt-green"></span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-control-bg/30 p-3 rounded-xl border border-white/5 relative overflow-hidden">
            <div className="text-[10px] text-text-secondary font-bold">Treasury Size</div>
            <div className="text-base font-extrabold font-mono text-text-primary mt-1">
              ₮{(Number(treasuryToday) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[9px] text-usdt-green mt-1 flex items-center gap-0.5 font-bold font-mono">
              <TrendingUp size={10} /> Active Pool
            </div>
          </div>

          <div className="bg-control-bg/30 p-3 rounded-xl border border-white/5 relative overflow-hidden">
            <div className="text-[10px] text-text-secondary font-bold">Merchant Vol (24H)</div>
            <div className="text-base font-extrabold font-mono text-text-primary mt-1">
              ₮{(Number(operatorVolume) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[9px] text-text-tertiary mt-1 flex items-center gap-0.5 font-bold">
              <Globe size={10} /> Global OTC Desks
            </div>
          </div>

          <div className="bg-control-bg/30 p-3 rounded-xl border border-white/5 relative overflow-hidden">
            <div className="text-[10px] text-text-secondary font-bold">Deposits Today</div>
            <div className="text-base font-extrabold font-mono text-usdt-green mt-1">
              ₮{(Number(depositsToday) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-control-bg/30 p-3 rounded-xl border border-white/5 relative overflow-hidden">
            <div className="text-[10px] text-text-secondary font-bold">Withdrawals Today</div>
            <div className="text-base font-extrabold font-mono text-error-red mt-1">
              ₮{(Number(withdrawalsToday) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="col-span-2 bg-control-bg/30 p-3 rounded-xl border border-white/5 relative overflow-hidden flex items-center justify-between">
            <div>
              <div className="text-[10px] text-text-secondary font-bold">Top growth yield</div>
              <div className="text-base font-extrabold font-mono text-gold-bright mt-1">
                +{topGrowth}%
              </div>
            </div>
            <span className="text-[10px] font-bold text-text-tertiary uppercase bg-control-bg px-2.5 py-1 rounded-lg border border-white/5">
              Escrow Enabled
            </span>
          </div>
        </div>
      </motion.div>

      {/* 3. DAILY CAPACITY ENGINE */}
      <CapacityEngine />

      {/* 5. SEASONS PROGRESS */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="web3-card-gold rounded-2xl p-4 relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
          <div className="flex items-center gap-1.5">
            <Calendar size={16} className="text-gold" />
            <h2 className="text-xs font-black uppercase text-text-primary tracking-widest">Active Season {seasonNumber}</h2>
          </div>
          <span className="text-[10px] font-bold text-gold bg-gold/10 border border-gold/20 px-2.5 py-0.5 rounded-full font-mono">
            {seasonTitle}
          </span>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex justify-between items-center text-xs">
            <div>
              <div className="text-text-secondary">Season Power Progress</div>
              <div className="text-sm font-black text-text-primary font-mono mt-1">
                {seasonProgressPower} / {seasonTargetPower} Pwr
              </div>
            </div>
            <div className="text-right">
              <div className="text-text-secondary">Time Remaining</div>
              <div className="text-sm font-black text-text-primary font-mono mt-1">
                {daysRemaining} Days
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 bg-control-bg rounded-full overflow-hidden p-0.5 border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-gold to-gold-bright rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(255,179,0,0.4)]"
              style={{ width: `${(seasonProgressPower / seasonTargetPower) * 100}%` }}
            />
          </div>

          <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 rounded-xl p-3 text-xs text-text-secondary">
            <Info size={15} className="text-gold flex-shrink-0" />
            <span>
              All reputation, trust scores, and permanent rank stats carry over to next season. Seasonal power goals reset.
            </span>
          </div>

          {seasonProgressPower >= seasonTargetPower ? (
            <button
              onClick={resetSeason}
              className="press-feedback bg-gradient-to-r from-gold to-gold-bright text-app-bg font-extrabold text-xs py-3 rounded-xl shadow-lg w-full flex items-center justify-center gap-1 shadow-gold/25"
            >
              Advance to Season {seasonNumber + 1} (Reset)
            </button>
          ) : (
            <button
              disabled
              className="bg-control-bg/40 text-text-tertiary font-extrabold text-xs py-3 rounded-xl border border-white/5 w-full cursor-not-allowed text-center uppercase tracking-wider"
            >
              Unlock Season Reward at {seasonTargetPower} Power
            </button>
          )}
        </div>
      </motion.div>

      {/* 6. COMMUNITY EVENTS LIST */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-3"
      >
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase text-text-secondary tracking-widest">Community Events</h2>
          <span className="text-[10px] text-text-tertiary font-mono">
            {events.length} Scheduled
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <div
              key={event.id}
              className={`
                web3-card rounded-2xl p-4 flex items-center justify-between shadow-md relative overflow-hidden
                ${event.status === 'ACTIVE' ? 'border-usdt-green/20' : 'opacity-70'}
              `}
            >
              <div className="flex flex-col gap-1 max-w-[70%]">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-extrabold text-text-primary">{event.title}</h3>
                  {event.badge && (
                    <span className="text-[9px] font-bold bg-usdt-green/10 border border-usdt-green/20 text-usdt-green px-2 py-0.5 rounded-full uppercase">
                      {event.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-text-secondary leading-normal">{event.description}</p>
              </div>

              <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
                event.status === 'ACTIVE' 
                  ? 'text-usdt-green bg-usdt-green/10 border-usdt-green/20 animate-pulse'
                  : 'text-text-tertiary bg-control-bg/40 border-white/5'
              }`}>
                {event.status}
              </span>
            </div>
          ))}
        </div>
      </motion.div>


      {/* --- MOCK SIMULATOR MODALS --- */}
      
      {/* 1. Deposit Simulator Modal */}
      <AnimatePresence>
        {showDepositModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDepositModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-[360px] glass-panel border border-white/15 p-5 rounded-3xl shadow-2xl bg-[#0d0e15] z-10"
            >
              <h3 className="text-base font-extrabold text-text-primary flex items-center gap-1.5">
                📥 USDT Deposit Portal
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                Deposit USDT to earn +200 daily power and active compute speed multiplier boost (1.5× yield boost).
              </p>

              <div className="flex flex-col gap-1.5 mt-4">
                <label className="text-[10px] font-bold text-text-tertiary uppercase">USDT Amount</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm font-mono text-text-tertiary">₮</span>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full bg-control-bg text-text-primary text-sm font-mono font-bold rounded-xl pl-7 pr-3 py-3 border border-white/10 focus:border-usdt-green focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-text-secondary text-xs font-bold hover:text-text-primary bg-control-bg/40 press-feedback"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDepositSubmit}
                  className="flex-1 py-3 rounded-xl bg-usdt-green text-app-bg text-xs font-extrabold hover:brightness-110 press-feedback shadow-lg shadow-usdt-green/20"
                >
                  Confirm Deposit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
