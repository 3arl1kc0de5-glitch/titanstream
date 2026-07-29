import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useWalletStore } from '../../store/useWalletStore';
import { useTreasuryStore } from '../../store/useTreasuryStore';
import { useGrowthStore } from '../../store/useGrowthStore';
import { showToast } from '../../components/Toast';
import { ArrowUpRight, ShieldCheck, Wallet, Lock } from 'lucide-react';

export const WithdrawScreen: React.FC = () => {
  const { usdtBalance } = useWalletStore();
  const { qualification } = useGrowthStore();
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<'TON' | 'BEP20'>('TON');

  const canWithdraw = qualification?.withdrawal.canWithdraw ?? true;

  const handleWithdraw = () => {
    if (!canWithdraw) {
      showToast(qualification?.withdrawal.reason || 'Withdrawal locked: need more qualified referrals', 'error');
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
      {/* Header with Tether Emblem */}
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
        <h1 className="text-title text-text-primary font-extrabold tracking-tight">Withdraw USDT</h1>
        <p className="text-body mt-1">
          Transfer your mined Tether directly to your crypto wallet
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
        <div className="text-3xl font-extrabold text-gradient-usdt font-mono mt-2 tracking-tight">
          {usdtBalance.toFixed(8)} USDT
        </div>
      </motion.div>

      {/* Network Selector Cards */}
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

      {/* Wallet Address Input */}
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
            : 'bg-gray-700 text-text-tertiary cursor-not-allowed'
        }`}
      >
        {canWithdraw ? (
          <>
            Withdraw USDT
            <ArrowUpRight size={20} />
          </>
        ) : (
          <>
            Withdrawals Locked
            <Lock size={20} />
          </>
        )}
      </motion.button>

      {/* Qualification Notice */}
      {!canWithdraw && qualification?.withdrawal.remainingNeeded && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
          <Lock size={14} className="shrink-0" />
          <span>
            {qualification.withdrawal.reason || `Need ${qualification.withdrawal.remainingNeeded} more qualified referral${qualification.withdrawal.remainingNeeded !== 1 ? 's' : ''} to unlock withdrawals.`}
            {' '}Go to <strong>Trust & Growth Hub</strong> to track your progress.
          </span>
        </div>
      )}

      {/* Withdrawal History */}
      <div className="flex flex-col gap-2.5 mt-1">
        <h2 className="text-sm font-bold text-text-primary">Withdrawal History</h2>
        <div className="glass-panel border border-dashed border-border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-10 h-10 rounded-full bg-control-bg flex items-center justify-center text-text-tertiary mb-1.5">
            <Wallet size={18} />
          </div>
          <div className="text-xs text-text-tertiary font-mono">No past withdrawal transactions</div>
        </div>
      </div>
    </div>
  );
};
