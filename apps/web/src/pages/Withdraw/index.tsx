import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useWalletStore } from '../../store/useWalletStore';
import { useTreasuryStore } from '../../store/useTreasuryStore';
import { useMiningStore } from '../../store/useMiningStore';
import { useReferralStore } from '../../store/useReferralStore';
import { useNavigationStore } from '../../store/useNavigationStore';
import { showToast } from '../../components/Toast';
import { ArrowUpRight, ShieldCheck, Wallet, Lock, UserPlus, Zap } from 'lucide-react';
import { CurrencyDisplay } from '../../components/DualCurrencyDisplay';

export const WithdrawScreen: React.FC = () => {
  const { usdtBalance } = useWalletStore();
  const { hasPurchasedMachine } = useMiningStore();
  const { invitedCount } = useReferralStore();
  const { setActiveTab } = useNavigationStore();

  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<'TON' | 'BEP20'>('TON');

  const hasMinReferrals = invitedCount >= 3;
  const canWithdraw = hasPurchasedMachine && hasMinReferrals;

  const handleWithdraw = () => {
    if (!hasPurchasedMachine) {
      showToast('Withdrawal Locked: Machine purchase required to unlock withdrawals', 'error');
      return;
    }
    if (!hasMinReferrals) {
      showToast(`Withdrawal Locked: Need 3 referrals to unlock trial withdrawal (Current: ${invitedCount}/3)`, 'error');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      showToast('Please enter a valid withdrawal amount', 'error');
      return;
    }
    if (parseFloat(amount) > usdtBalance) {
      showToast('Insufficient USDT balance', 'error');
      return;
    }
    if (!address) {
      showToast('Please enter a wallet address', 'error');
      return;
    }

    showToast(`Withdrawal of ${amount} USDT to ${address} (${selectedNetwork}) requested!`, 'success');
    useTreasuryStore.getState().incrementMissionProgress('WITHDRAW', 1);
  };

  return (
    <div className="p-4 flex flex-col gap-5">
      {/* Header with Emblem */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center text-center my-2"
      >
        <div className="relative mb-3">
          <div className="absolute inset-0 rounded-full bg-usdt-green/30 blur-2xl animate-glow" />
          <div className="relative w-18 h-18 rounded-full bg-gradient-to-br from-usdt-green via-[#00c853] to-app-bg text-app-bg border-2 border-white/20 flex items-center justify-center font-extrabold text-4xl shadow-[0_0_30px_rgba(0,230,118,0.4)]">
            ₮
          </div>
        </div>
        <h1 className="text-title text-text-primary font-extrabold tracking-tight">Withdraw Funds</h1>
        <p className="text-body mt-1">
          Transfer your mined yield directly to your mobile wallet or crypto account
        </p>
      </motion.div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="glass-panel bg-gradient-to-br from-usdt-green/20 via-card-glass to-card-glass border border-usdt-green/40 p-4.5 rounded-2xl shadow-xl relative overflow-hidden"
      >
        <div className="flex items-center justify-between text-xs font-bold text-text-secondary uppercase">
          <span>Available Balance</span>
          <span className="text-usdt-green bg-usdt-green/15 px-2.5 py-0.5 rounded-full border border-usdt-green/30 flex items-center gap-1 font-mono">
            <ShieldCheck size={12} /> Instant
          </span>
        </div>
        <div className="mt-2">
          <CurrencyDisplay amount={usdtBalance} size="lg" className="text-3xl font-extrabold text-gradient-usdt font-mono tracking-tight" />
        </div>
      </motion.div>

      {/* Requirement Banners if locked */}
      {!canWithdraw && (
        <div className="flex flex-col gap-3">
          {!hasPurchasedMachine && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex flex-col gap-2 shadow-md">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <Lock size={14} className="shrink-0 text-rose-400" />
                <span>Cloud Machine Purchase Required</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Free trial earnings ($5.00 max) are unlocked for withdrawal after acquiring a Cloud Machine.
              </p>
              <button
                onClick={() => setActiveTab('boost')}
                className="self-start px-3.5 py-1.5 rounded-xl bg-usdt-green text-app-bg font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1 shadow-md hover:brightness-110 press-feedback"
              >
                <Zap size={12} />
                <span>Acquire Cloud Machine</span>
              </button>
            </div>
          )}

          {!hasMinReferrals && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex flex-col gap-2 shadow-md">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <Lock size={14} className="shrink-0 text-amber-400" />
                <span>3 Referrals Required ({invitedCount}/3 Completed)</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Invite at least 3 friends to join your cloud network to unlock trial withdrawal privileges.
              </p>
              <button
                onClick={() => setActiveTab('friends')}
                className="self-start px-3.5 py-1.5 rounded-xl bg-ton-blue text-white font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1 shadow-md hover:brightness-110 press-feedback"
              >
                <UserPlus size={12} />
                <span>Invite Friends ({invitedCount}/3)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Network Selector */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col gap-2.5"
      >
        <label className="text-xs font-bold text-text-secondary">Select Network</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSelectedNetwork('TON')}
            className={`
              press-feedback p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all shadow-md
              ${selectedNetwork === 'TON'
                ? 'bg-usdt-green/15 border-usdt-green text-usdt-green shadow-[0_0_15px_rgba(0,230,118,0.25)]'
                : 'glass-panel border-white/10 text-text-secondary hover:text-text-primary'
              }
            `}
          >
            <span className="font-extrabold text-sm">TON Network</span>
            <span className="text-[10px] text-text-tertiary font-mono">Low Fee (~0.1 USDT)</span>
          </button>

          <button
            onClick={() => setSelectedNetwork('BEP20')}
            className={`
              press-feedback p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all shadow-md
              ${selectedNetwork === 'BEP20'
                ? 'bg-usdt-green/15 border-usdt-green text-usdt-green shadow-[0_0_15px_rgba(0,230,118,0.25)]'
                : 'glass-panel border-white/10 text-text-secondary hover:text-text-primary'
              }
            `}
          >
            <span className="font-extrabold text-sm">BNB Chain (BEP20)</span>
            <span className="text-[10px] text-text-tertiary font-mono">Standard (~0.5 USDT)</span>
          </button>
        </div>
      </motion.div>

      {/* Destination Wallet Address Input */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="flex flex-col gap-2"
      >
        <label className="text-xs font-bold text-text-secondary">Destination Wallet Address</label>
        <input
          type="text"
          placeholder="Paste your USDT wallet address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full bg-control-bg/80 text-text-primary placeholder:text-text-tertiary text-xs rounded-xl px-4 py-3.5 border border-white/10 focus:border-usdt-green focus:outline-none transition-colors shadow-inner"
        />
      </motion.div>

      {/* Amount Input */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="flex flex-col gap-2"
      >
        <label className="text-xs font-bold text-text-secondary">Withdrawal Amount</label>
        <div className="relative flex items-center">
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-control-bg/80 text-text-primary placeholder:text-text-tertiary text-sm font-mono font-bold rounded-xl pl-4 pr-16 py-3.5 border border-white/10 focus:border-usdt-green focus:outline-none transition-colors shadow-inner"
          />
          <button
            onClick={() => setAmount(usdtBalance.toString())}
            className="absolute right-3 text-xs font-extrabold text-usdt-green bg-usdt-green/15 border border-usdt-green/30 px-3 py-1 rounded-lg hover:brightness-110"
          >
            Max
          </button>
        </div>
      </motion.div>

      {/* Submit Button */}
      <motion.button
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        onClick={handleWithdraw}
        disabled={!canWithdraw}
        className={`press-feedback w-full py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 mt-2 ${
          canWithdraw
            ? 'bg-gradient-to-r from-usdt-green to-[#00c853] text-app-bg shadow-[0_4px_25px_rgba(0,230,118,0.4)]'
            : 'bg-gray-800 text-text-tertiary cursor-not-allowed border border-white/10'
        }`}
      >
        {canWithdraw ? (
          <>
            Withdraw USDT
            <ArrowUpRight size={20} />
          </>
        ) : (
          <>
            Withdrawal Locked
            <Lock size={20} />
          </>
        )}
      </motion.button>
    </div>
  );
};
