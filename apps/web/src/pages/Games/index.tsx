import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Dices, Trophy, Sparkles } from 'lucide-react';
import { useNavigationStore } from '../../store/useNavigationStore';
import { showToast } from '../../components/Toast';
import { RouletteGame } from './components/RouletteGame';
import { BasketballGame } from './components/BasketballGame';

export const GamesScreen: React.FC = () => {
  const { closeGames } = useNavigationStore();
  const [activeGame, setActiveGame] = useState<'roulette' | 'basketball' | null>(null);

  return (
    <div className="fixed inset-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 bg-app-bg text-text-primary flex flex-col p-4 overflow-y-auto animate-fade-in">
      {/* Header bar */}
      <div className="flex items-center gap-3 mb-4 pt-2">
        <button
          onClick={closeGames}
          className="press-feedback p-2.5 rounded-full glass-panel text-text-secondary hover:text-text-primary shadow-md"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-title text-text-primary font-extrabold tracking-tight">Mini-Games</h1>
      </div>

      <p className="text-body mb-5">
        Play exciting mini-games to boost your compute power and earn extra USDT rewards!
      </p>

      {/* Games List */}
      <div className="flex flex-col gap-4">
        {/* Game 1: USDT Roulette Wheel */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="glass-panel border border-white/10 hover:border-usdt-green/40 rounded-2xl p-5 flex flex-col gap-4 shadow-xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-usdt-green/15 text-usdt-green border border-usdt-green/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,230,118,0.25)]">
                <Dices size={24} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-text-primary">Crypto Roulette</h3>
                <p className="text-xs text-text-secondary mt-0.5">Spin to win up to 1.0 USDT instant prize</p>
              </div>
            </div>
            <span className="bg-gold/20 text-gold text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border border-gold/40 shadow-sm">
              POPULAR
            </span>
          </div>

          {/* Prize preview strip */}
          <div className="bg-control-bg/80 p-3 rounded-xl flex items-center justify-between text-xs font-mono border border-white/5 shadow-inner">
            <span className="text-usdt-green font-bold">₮ 0.25</span>
            <span className="text-[#a7ffeb] font-bold">💎 25</span>
            <span className="text-usdt-green font-bold">₮ 1.00</span>
            <span className="text-text-secondary">×1.5 Boost</span>
          </div>

          <button
            onClick={() => setActiveGame('roulette')}
            className="press-feedback bg-gradient-to-r from-usdt-green to-[#00c853] text-app-bg font-extrabold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,230,118,0.35)]"
          >
            <Sparkles size={16} /> Play Roulette
          </button>
        </motion.div>

        {/* Game 2: Basketball Hoops */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="glass-panel border border-white/10 hover:border-ton-blue/40 rounded-2xl p-5 flex flex-col gap-4 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-ton-blue/15 text-ton-blue border border-ton-blue/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,136,204,0.25)]">
                <Trophy size={24} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-text-primary">Hoop Masters</h3>
                <p className="text-xs text-text-secondary mt-0.5">Score baskets to earn extra crystals</p>
              </div>
            </div>
            <span className="bg-usdt-green/20 text-usdt-green text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase border border-usdt-green/30">
              NEW
            </span>
          </div>

          <button
            onClick={() => setActiveGame('basketball')}
            className="press-feedback bg-control-bg/80 hover:bg-border text-text-primary font-bold text-sm py-3.5 rounded-xl flex items-center justify-center border border-white/10 shadow-md"
          >
            Play Hoop Masters
          </button>
        </motion.div>
      </div>

      {/* Render active games overlays */}
      {activeGame === 'roulette' && (
        <RouletteGame onClose={() => setActiveGame(null)} showToast={showToast} />
      )}
      {activeGame === 'basketball' && (
        <BasketballGame onClose={() => setActiveGame(null)} showToast={showToast} />
      )}
    </div>
  );
};
