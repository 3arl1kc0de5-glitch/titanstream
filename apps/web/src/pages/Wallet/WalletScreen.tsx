import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  PlusCircle,
  History,
  Clock,
  RefreshCw,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  ArrowDownLeft,
  ArrowDownToLine,
  TrendingUp,
  Cpu,
  Coins
} from 'lucide-react';
import { useWalletStore } from '../../store/useWalletStore';
import { FundingModal } from '../../components/funding/FundingModal';
import { WithdrawModal } from '../../components/funding/WithdrawModal';
import { TransactionHistoryView } from '../../components/funding/TransactionHistoryView';
import { SettlementTracker } from '../../components/funding/SettlementTracker';
import { useTelegram } from '../../context/TelegramContext';
import { CurrencyDisplay } from '../../components/DualCurrencyDisplay';
import { EducationCard } from '../../components/EducationCard';

export const WalletScreen: React.FC = () => {
  const [isFundingModalOpen, setIsFundingModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [selectedPendingId, setSelectedPendingId] = useState<string | null>(null);

  const {
    usdtBalance,
    pendingSettlements,
    transactions,
    isLoadingBalance,
    fetchBalanceFromEngine,
    fetchSettlementHistory,
    fetchTransactions,
    lifetimeDeposits,
    lifetimeWithdrawals,
    totalRewards,
    activeMachines,
  } = useWalletStore();

  const { hapticFeedback } = useTelegram();

  useEffect(() => {
    fetchBalanceFromEngine();
    fetchSettlementHistory();
    fetchTransactions(5, 0);
  }, [fetchBalanceFromEngine, fetchSettlementHistory, fetchTransactions]);

  const handleRefresh = () => {
    hapticFeedback.impactOccurred('light');
    fetchBalanceFromEngine();
    fetchSettlementHistory();
    fetchTransactions(5, 0);
  };

  const selectedPendingSession = pendingSettlements.find((s) => s.settlementId === selectedPendingId);

  return (
    <div className="w-full space-y-4 pb-20 select-none">
      
      {/* Progressive Education: Deposit */}
      <EducationCard
        educationKey="deposit"
        title="Understanding Deposits"
        body="Fund your TetherStream balance using local Mobile Money or Telegram @CryptoBot. Every deposit is logged in our production financial ledger and credited to your available balance immediately upon operator confirmation."
      />

      {/* Balance Hero Card */}
      <div className="glass-panel p-5 rounded-3xl relative overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-br from-usdt-green/10 via-app-bg to-control-bg">
        {/* Glow effect */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-usdt-green/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-usdt-green/20 text-usdt-green flex items-center justify-center font-bold text-xs">
              ₮
            </div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-text-tertiary">
              Balance Engine Derived
            </span>
          </div>

          <button
            onClick={handleRefresh}
            className="press-feedback p-1.5 rounded-full bg-white/5 border border-white/10 text-text-secondary hover:text-text-primary"
            title="Sync Balance Engine"
          >
            <RefreshCw size={14} className={isLoadingBalance ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Big Balance Number */}
        <div className="my-2">
          <div className="flex items-baseline gap-2">
            <CurrencyDisplay amount={usdtBalance} size="lg" className="text-4xl font-extrabold text-text-primary font-mono tracking-tight" />
          </div>
          <p className="text-[11px] text-text-tertiary mt-1">
            Settled double-entry ledger funds available for ecosystem operations.
          </p>
        </div>

        {/* Primary Action Buttons Grid */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/10">
          {/* Add Funds CTA */}
          <button
            onClick={() => {
              hapticFeedback.impactOccurred('medium');
              setIsFundingModalOpen(true);
            }}
            className="press-feedback py-3 px-2 rounded-2xl bg-usdt-green text-app-bg font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-lg shadow-usdt-green/20"
          >
            <PlusCircle size={16} />
            <span>Add Funds</span>
          </button>

          {/* Withdraw CTA */}
          <button
            onClick={() => {
              hapticFeedback.impactOccurred('light');
              setIsWithdrawModalOpen(true);
            }}
            className="press-feedback py-3 px-2 rounded-2xl bg-gradient-to-r from-usdt-green to-[#00c853] text-app-bg font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-lg shadow-usdt-green/20 hover:brightness-110 transition-all"
          >
            <ArrowDownToLine size={16} />
            <span>Withdraw</span>
            <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded-full">Instant</span>
          </button>

          {/* Transaction History CTA */}
          <button
            onClick={() => {
              hapticFeedback.impactOccurred('light');
              setIsHistoryModalOpen(true);
            }}
            className="press-feedback py-3 px-2 rounded-2xl bg-control-bg/80 border border-white/10 hover:border-white/20 text-text-primary font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-sm"
          >
            <History size={16} className="text-usdt-green" />
            <span>History</span>
          </button>
        </div>
      </div>

      {/* Lifetime Stats Dashboard */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="glass-panel p-3.5 rounded-2xl border border-white/10 bg-control-bg/25 flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[10px] font-bold text-text-tertiary uppercase">
            <TrendingUp size={12} className="text-usdt-green" />
            <span>Lifetime Deposits</span>
          </div>
          <CurrencyDisplay amount={lifetimeDeposits} size="sm" className="text-base font-extrabold text-text-primary" />
        </div>

        <div className="glass-panel p-3.5 rounded-2xl border border-white/10 bg-control-bg/25 flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[10px] font-bold text-text-tertiary uppercase">
            <ArrowDownToLine size={12} className="text-error-red" />
            <span>Lifetime Withdrawals</span>
          </div>
          <CurrencyDisplay amount={lifetimeWithdrawals} size="sm" className="text-base font-extrabold text-text-primary" />
        </div>

        <div className="glass-panel p-3.5 rounded-2xl border border-white/10 bg-control-bg/25 flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[10px] font-bold text-text-tertiary uppercase">
            <Coins size={12} className="text-gold" />
            <span>Accumulated Yield</span>
          </div>
          <CurrencyDisplay amount={totalRewards} size="sm" className="text-base font-extrabold text-text-primary" />
        </div>

        <div className="glass-panel p-3.5 rounded-2xl border border-white/10 bg-control-bg/25 flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[10px] font-bold text-text-tertiary uppercase">
            <Cpu size={12} className="text-sky-400" />
            <span>Active Machines</span>
          </div>
          <span className="text-base font-extrabold text-text-primary font-mono">{activeMachines} units</span>
        </div>
      </div>

      {/* Pending Settlements Section if any exist */}
      {pendingSettlements.length > 0 && (
        <div className="glass-panel p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-400 animate-spin" />
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                Pending Settlements ({pendingSettlements.length})
              </h4>
            </div>
            <span className="text-[10px] font-semibold text-text-tertiary">Live Polling</span>
          </div>

          <div className="space-y-2">
            {pendingSettlements.map((session) => (
              <div
                key={session.settlementId}
                onClick={() => {
                  hapticFeedback.selectionChanged();
                  setSelectedPendingId(
                    selectedPendingId === session.settlementId ? null : session.settlementId
                  );
                }}
                className="press-feedback p-3 rounded-xl bg-control-bg border border-white/10 hover:border-amber-400/40 flex items-center justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-extrabold text-text-primary">
                      +{session.expectedCryptoAmount || session.expectedAssetAmount} USDT
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {session.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-[11px] text-text-tertiary mt-0.5 font-mono">
                    Ref: #{session.referenceCode || session.reference || session.settlementId.slice(-8)}
                  </div>
                </div>

                <ChevronRight size={16} className="text-text-tertiary" />
              </div>
            ))}
          </div>

          {/* Selected Pending Tracker View */}
          {selectedPendingSession && (
            <div className="pt-2">
              <SettlementTracker
                session={selectedPendingSession}
                onClose={() => setSelectedPendingId(null)}
              />
            </div>
          )}
        </div>
      )}

      {/* Security Guarantee banner */}
      <div className="p-3.5 rounded-2xl glass-panel border border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-usdt-green/10 text-usdt-green flex items-center justify-center shrink-0">
          <ShieldCheck size={20} />
        </div>
        <div className="text-xs">
          <div className="font-extrabold text-text-primary">Universal Settlement Framework</div>
          <div className="text-text-tertiary mt-0.5 text-[11px]">
            Every funding action flows securely through double-entry ledger & orchestrator verification.
          </div>
        </div>
      </div>

      {/* Recent Financial Activity Card */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-tertiary">
            Recent Activity
          </h4>
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="text-xs font-bold text-usdt-green hover:underline flex items-center gap-0.5"
          >
            <span>View All</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="py-6 text-center text-xs text-text-tertiary">
            No recent ledger transactions recorded.
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 4).map((tx) => (
              <div
                key={tx.id}
                className="p-3 rounded-xl bg-control-bg/60 border border-white/5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-usdt-green/20 text-usdt-green flex items-center justify-center font-bold">
                    <ArrowDownLeft size={16} />
                  </div>
                  <div>
                    <div className="font-bold text-text-primary">{tx.type || 'Deposit'}</div>
                    <div className="text-[10px] text-text-tertiary font-mono">#{tx.reference || tx.id.slice(-6)}</div>
                  </div>
                </div>

                <div className="text-right font-mono font-bold text-usdt-green">
                  +{tx.amount} {tx.asset || 'USDT'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dynamic Funding Modal */}
      <FundingModal
        isOpen={isFundingModalOpen}
        onClose={() => setIsFundingModalOpen(false)}
      />

      {/* Full History View Drawer / Overlay */}
      <AnimatePresence>
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 pb-20 sm:pb-4">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="w-full max-w-md bg-app-bg border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[calc(90vh-80px)] sm:max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                <h3 className="text-base font-extrabold text-text-primary">Ledger & Settlement Log</h3>
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="press-feedback px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-text-secondary"
                >
                  Close
                </button>
              </div>

              <TransactionHistoryView onClose={() => setIsHistoryModalOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
      />
    </div>
  );
};
