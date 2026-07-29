import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Battery,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Loader2,
  Sparkles,
  Flame,
  Rocket,
  Package,
  Users,
  Crown
} from 'lucide-react';
import { useCapacityStore, type CapacityOpportunity, type CapacityLevel } from '../../../store/useCapacityStore';
import { showToast } from '../../../components/Toast';

export const CapacityEngine: React.FC = () => {
  const {
    currentCapacity,
    todayCapacityEarned,
    capacityLevel,
    dailyCycleStatus,
    consecutiveDays,
    opportunities,
    earningMultiplier,
    referralMultiplier,
    withdrawalLimit,
    activateDailyCycle,
    addCapacity,
    claimSettlement,
    purchaseCapacityBoost,
    purchaseCapacityPack,
    purchaseReferralAccelerator,
    upgradeMembership
  } = useCapacityStore();

  const [isProcessing, setIsProcessing] = useState(false);

  const handleActivateCycle = () => {
    setIsProcessing(true);
    setTimeout(() => {
      activateDailyCycle();
      setIsProcessing(false);
      showToast('Daily operations activated! +10 Capacity earned.', 'success');
    }, 800);
  };

  const handleClaimSettlement = () => {
    setIsProcessing(true);
    setTimeout(() => {
      claimSettlement();
      setIsProcessing(false);
      showToast('Daily settlement claimed! Your earning capacity is updated.', 'success');
    }, 800);
  };

  const handleOpportunity = (opportunity: CapacityOpportunity) => {
    if (opportunity.isPaid && opportunity.price) {
      // Handle paid opportunities
      switch (opportunity.source) {
        case 'CAPACITY_BOOST':
          purchaseCapacityBoost(opportunity.reward, opportunity.price);
          showToast(`Capacity Boost purchased! +${opportunity.reward} Capacity for 24h.`, 'success');
          break;
        case 'CAPACITY_PACK':
          purchaseCapacityPack(opportunity.reward, opportunity.price);
          showToast(`Capacity Pack purchased! +${opportunity.reward} permanent Capacity.`, 'success');
          break;
        case 'REFERRAL_ACCELERATOR':
          purchaseReferralAccelerator(7, opportunity.price);
          showToast(`Referral Accelerator activated! 7-day capacity multiplier.`, 'success');
          break;
        default:
          break;
      }
    } else {
      // Handle free opportunities
      switch (opportunity.source) {
        case 'DEPOSIT':
          showToast('Navigate to Wallet to make a deposit.', 'info');
          break;
        case 'REFERRAL_SIGNUP':
          showToast('Navigate to Friends to refer new users.', 'info');
          break;
        case 'CONSECUTIVE_DAYS':
          showToast('Stay active daily to earn consecutive day bonuses.', 'info');
          break;
        default:
          addCapacity(opportunity.source, opportunity.reward, opportunity.description);
          showToast(`+${opportunity.reward} Capacity earned!`, 'success');
      }
    }
  };

  const getLevelIcon = (level: CapacityLevel) => {
    switch (level) {
      case 'SEED': return '🌱';
      case 'BUILDER': return '🔨';
      case 'OPERATOR': return '⚙️';
      case 'PARTNER': return '🤝';
      case 'ELITE': return '💎';
      case 'TITAN': return '🏆';
      case 'INSTITUTIONAL': return '🏛️';
      default: return '🌱';
    }
  };

  const getLevelColor = (level: CapacityLevel) => {
    switch (level) {
      case 'SEED': return 'text-green-400';
      case 'BUILDER': return 'text-blue-400';
      case 'OPERATOR': return 'text-purple-400';
      case 'PARTNER': return 'text-yellow-400';
      case 'ELITE': return 'text-pink-400';
      case 'TITAN': return 'text-orange-400';
      case 'INSTITUTIONAL': return 'text-cyan-400';
      default: return 'text-green-400';
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Capacity Overview Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="web3-card rounded-2xl p-4 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-usdt-green/5 rounded-full blur-xl pointer-events-none" />
        
        <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
          <div className="flex items-center gap-1.5">
            <Battery size={16} className="text-usdt-green" />
            <h2 className="text-xs font-black uppercase text-text-primary tracking-widest">Daily Capacity Engine</h2>
          </div>
          <div className={`text-[10px] font-bold uppercase bg-control-bg px-2.5 py-0.5 rounded-full border border-white/5 font-mono ${
            dailyCycleStatus === 'SETTLEMENT_CLAIMED' ? 'text-usdt-green' : 'text-text-secondary'
          }`}>
            {dailyCycleStatus.replace('_', ' ')}
          </div>
        </div>

        {/* Capacity Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-control-bg/30 p-3 rounded-xl border border-white/5">
            <div className="text-[10px] text-text-secondary font-bold">Current Capacity</div>
            <div className="text-lg font-black text-text-primary font-mono mt-1">
              {currentCapacity.toLocaleString()}
            </div>
            <div className="text-[8px] text-usdt-green mt-0.5 font-mono">
              +{todayCapacityEarned} Today
            </div>
          </div>

          <div className="bg-control-bg/30 p-3 rounded-xl border border-white/5">
            <div className="text-[10px] text-text-secondary font-bold">Capacity Level</div>
            <div className="text-lg font-black text-text-primary mt-1 flex items-center gap-1">
              <span>{getLevelIcon(capacityLevel)}</span>
              <span className={getLevelColor(capacityLevel)}>{capacityLevel}</span>
            </div>
            <div className="text-[8px] text-text-tertiary mt-0.5 font-mono">
              {consecutiveDays} Day Streak
            </div>
          </div>
        </div>

        {/* Multipliers Display */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 bg-usdt-green/10 border border-usdt-green/20 rounded-xl p-2 text-center">
            <div className="text-[9px] text-usdt-green font-bold uppercase">Earning</div>
            <div className="text-sm font-black text-usdt-green font-mono">{earningMultiplier}×</div>
          </div>
          <div className="flex-1 bg-purple-500/10 border border-purple-500/20 rounded-xl p-2 text-center">
            <div className="text-[9px] text-purple-400 font-bold uppercase">Referral</div>
            <div className="text-sm font-black text-purple-400 font-mono">{referralMultiplier}×</div>
          </div>
          <div className="flex-1 bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-2 text-center">
            <div className="text-[9px] text-cyan-400 font-bold uppercase">Withdraw</div>
            <div className="text-sm font-black text-cyan-400 font-mono">${withdrawalLimit}</div>
          </div>
        </div>

        {/* Dynamic Action Area */}
        <div className="bg-control-bg/25 border border-white/5 rounded-2xl p-4">
          {dailyCycleStatus === 'NOT_ACTIVATED' && (
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-full bg-usdt-green/10 text-usdt-green flex items-center justify-center mx-auto mb-3">
                <Zap size={24} />
              </div>
              <h3 className="text-sm font-extrabold text-text-primary">Activate Today's Operations</h3>
              <p className="text-xs text-text-secondary mt-1 max-w-[90%] mx-auto">
                Start your daily earning cycle and unlock capacity opportunities.
              </p>
              <button
                disabled={isProcessing}
                onClick={handleActivateCycle}
                className="press-feedback bg-gradient-to-r from-usdt-green to-[#00c853] text-app-bg font-extrabold text-xs px-6 py-3 rounded-xl shadow-lg mt-4 w-full flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,230,118,0.2)]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Activating...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Activate Operations
                  </>
                )}
              </button>
            </div>
          )}

          {dailyCycleStatus === 'ACTIVATED' && (
            <div className="text-center py-2">
              <h3 className="text-sm font-extrabold text-text-primary">Increase Your Capacity</h3>
              <p className="text-xs text-text-secondary mt-1">
                Complete opportunities below to earn capacity and unlock higher multipliers.
              </p>
            </div>
          )}

          {dailyCycleStatus === 'CAPACITY_EARNED' && (
            <div className="text-center py-2">
              <div className="w-10 h-10 rounded-full bg-usdt-green/10 text-usdt-green flex items-center justify-center mx-auto mb-2">
                <TrendingUp size={20} />
              </div>
              <h3 className="text-sm font-extrabold text-text-primary">Ready for Settlement</h3>
              <p className="text-xs text-text-secondary mt-1">
                You've earned +{todayCapacityEarned} capacity today. Claim your settlement to update your earning potential.
              </p>
              <button
                disabled={isProcessing}
                onClick={handleClaimSettlement}
                className="press-feedback bg-gradient-to-r from-usdt-green to-[#00c853] text-app-bg font-extrabold text-xs px-6 py-3 rounded-xl shadow-lg mt-4 w-full flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,230,118,0.2)]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} /> Claim Settlement
                  </>
                )}
              </button>
            </div>
          )}

          {dailyCycleStatus === 'SETTLEMENT_CLAIMED' && (
            <div className="text-center py-2">
              <div className="w-10 h-10 rounded-full bg-text-secondary/10 text-text-secondary flex items-center justify-center mx-auto mb-2">
                <Clock size={20} />
              </div>
              <h3 className="text-sm font-extrabold text-text-primary">Today's Cycle Complete</h3>
              <p className="text-xs text-text-secondary mt-1">
                Return tomorrow to activate a new earning cycle.
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Capacity Opportunities */}
      {dailyCycleStatus !== 'NOT_ACTIVATED' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-col gap-3"
        >
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase text-text-secondary tracking-widest">Capacity Opportunities</h2>
            <span className="text-[10px] text-text-tertiary font-mono">
              {opportunities.filter(o => o.isAvailable).length} Available
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {opportunities.map((opportunity) => (
              <div
                key={opportunity.id}
                className={`
                  rounded-2xl p-4 flex items-center justify-between transition-all shadow-md
                  ${opportunity.isPaid 
                    ? 'web3-card-gold hover:border-gold/30' 
                    : 'web3-card hover:border-white/15'
                  }
                  ${!opportunity.isAvailable ? 'opacity-50' : ''}
                `}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-control-bg border border-white/5 flex items-center justify-center text-lg flex-shrink-0">
                    {opportunity.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-extrabold text-text-primary truncate">
                        {opportunity.title}
                      </h3>
                      {opportunity.isPaid && (
                        <span className="text-[8px] font-bold bg-gold/10 border border-gold/30 text-gold px-1.5 py-0.5 rounded-full flex-shrink-0">
                          <Crown size={8} className="inline mr-0.5" /> PAID
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-secondary truncate">{opportunity.description}</p>
                    {opportunity.progress !== undefined && opportunity.target && (
                      <div className="mt-1.5">
                        <div className="flex justify-between text-[9px] text-text-tertiary font-mono mb-0.5">
                          <span>Progress</span>
                          <span>{opportunity.progress}/{opportunity.target}</span>
                        </div>
                        <div className="w-full h-1 bg-control-bg rounded-full overflow-hidden">
                          <div
                            className="h-full bg-usdt-green rounded-full transition-all"
                            style={{ width: `${(opportunity.progress / opportunity.target) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 ml-3 flex-shrink-0">
                  <div className="text-right">
                    {opportunity.isPaid && opportunity.price ? (
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-black text-gold font-mono">${opportunity.price.toFixed(2)}</span>
                        <span className="text-[9px] text-text-tertiary">+{opportunity.reward} Cap</span>
                      </div>
                    ) : (
                      <span className="text-xs font-mono font-black text-usdt-green bg-usdt-green/10 border border-usdt-green/20 px-2 py-0.5 rounded-full">
                        +{opportunity.reward}
                      </span>
                    )}
                  </div>

                  <button
                    disabled={!opportunity.isAvailable}
                    onClick={() => handleOpportunity(opportunity)}
                    className={`
                      press-feedback font-extrabold text-[10px] px-3 py-1.5 rounded-lg border transition-all flex items-center gap-0.5
                      ${opportunity.isPaid
                        ? 'bg-gold text-app-bg border-gold hover:brightness-110'
                        : 'bg-control-bg border-white/10 text-text-primary hover:border-usdt-green/30'
                      }
                      ${!opportunity.isAvailable ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {opportunity.isPaid ? <Package size={10} /> : <Sparkles size={10} />}
                    {opportunity.isPaid ? 'Buy' : 'Claim'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Capacity Level Benefits */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="web3-card rounded-2xl p-4 relative overflow-hidden"
      >
        <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
          <div className="flex items-center gap-1.5">
            <Crown size={16} className="text-gold" />
            <h2 className="text-xs font-black uppercase text-text-primary tracking-widest">Level Benefits</h2>
          </div>
          <span className={`text-[10px] font-bold uppercase bg-control-bg px-2.5 py-0.5 rounded-full border border-white/5 font-mono ${getLevelColor(capacityLevel)}`}>
            {capacityLevel}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">Earning Multiplier</span>
            <span className={`font-black font-mono ${getLevelColor(capacityLevel)}`}>{earningMultiplier}×</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">Referral Multiplier</span>
            <span className={`font-black font-mono ${getLevelColor(capacityLevel)}`}>{referralMultiplier}×</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">Withdrawal Limit</span>
            <span className={`font-black font-mono ${getLevelColor(capacityLevel)}`}>${withdrawalLimit}</span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="text-[10px] text-text-tertiary leading-relaxed">
              Increase your capacity to unlock higher levels with better multipliers and privileges.
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
