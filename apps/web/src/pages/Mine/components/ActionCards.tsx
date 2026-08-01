import type React from 'react';
import { Zap, UserPlus, ChevronRight, Coins } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigationStore } from '../../../store/useNavigationStore';
import { useMiningStore } from '../../../store/useMiningStore';
import { showToast } from '../../../components/Toast';
import { CurrencyDisplay } from '../../../components/DualCurrencyDisplay';

export const ActionCards: React.FC = () => {
  const { setActiveTab } = useNavigationStore();
  const { unclaimedBalance, claimMinedYield, activeCurrency } = useMiningStore();

  const safeUnclaimed = Number(unclaimedBalance) || 0;

  const handleClaim = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (safeUnclaimed <= 0) return;
    const success = await claimMinedYield();
    if (success) {
      showToast(`Successfully received +${safeUnclaimed.toFixed(4)} ${activeCurrency} in your wallet.`, 'success');
    } else {
      showToast('Action could not be completed. Please try again.', 'error');
    }
  };

  return (
    <div className="px-4 flex flex-col gap-3 my-3">
      {/* Receive Stream Output Card */}
      {safeUnclaimed > 0 && (
        <motion.div
          whileTap={{ scale: 0.97 }}
          onClick={handleClaim}
          className="glass-panel rounded-2xl p-4 flex items-center justify-between cursor-pointer border border-usdt-green/40 hover:border-usdt-green bg-gradient-to-r from-usdt-green/15 to-transparent transition-all shadow-lg group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-usdt-green/20 text-usdt-green border border-usdt-green/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,230,118,0.3)]">
              <Coins size={22} />
            </div>
            <div>
              <div className="text-sm font-black text-usdt-green font-sans flex items-center gap-1">
                Receive Stream Output
              </div>
              <div className="text-xs text-text-secondary mt-0.5 font-sans font-medium flex items-center gap-1">
                <span>Accrued:</span>
                <strong className="text-text-primary">
                  <CurrencyDisplay amount={safeUnclaimed} size="sm" />
                </strong>
                <span>. Tap to add to balance.</span>
              </div>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-usdt-green/15 border border-usdt-green/30 flex items-center justify-center text-usdt-green group-hover:bg-usdt-green group-hover:text-app-bg transition-all">
            <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </motion.div>
      )}

      {/* Deploy Stream Titan Card */}
      <motion.div
        whileTap={{ scale: 0.97 }}
        onClick={() => setActiveTab('boost')}
        className="glass-panel rounded-2xl p-4 flex items-center justify-between cursor-pointer border border-white/10 hover:border-usdt-green/40 transition-all shadow-lg group"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-usdt-green/15 text-usdt-green border border-usdt-green/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,230,118,0.2)]">
            <Zap size={22} />
          </div>
          <div>
            <div className="text-sm font-black text-text-primary group-hover:text-usdt-green transition-colors font-sans">
              Deploy Stream Titan
            </div>
            <div className="text-xs text-text-secondary mt-0.5 font-sans font-medium">Add a cloud machine to expand compute capacity and daily output</div>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary group-hover:text-text-primary group-hover:bg-white/10 transition-all">
          <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </motion.div>

      {/* Invite a friend Action Card */}
      <motion.div
        whileTap={{ scale: 0.97 }}
        onClick={() => setActiveTab('friends')}
        className="glass-panel rounded-2xl p-4 flex items-center justify-between cursor-pointer border border-white/10 hover:border-ton-blue/40 transition-all shadow-lg group"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-ton-blue/15 text-ton-blue border border-ton-blue/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,136,204,0.2)]">
            <UserPlus size={22} />
          </div>
          <div>
            <div className="text-sm font-black text-text-primary group-hover:text-ton-blue transition-colors font-sans">
              Expand the Network
            </div>
            <div className="text-xs text-text-secondary mt-0.5 font-sans font-medium">Share with friends to grow the shared cloud network</div>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary group-hover:text-text-primary group-hover:bg-white/10 transition-all">
          <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </motion.div>
    </div>
  );
};
