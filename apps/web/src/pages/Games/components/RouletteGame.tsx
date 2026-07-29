import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { useWalletStore } from '../../../store/useWalletStore';
import { useQuestStore } from '../../../store/useQuestStore';

interface RouletteGameProps {
  onClose: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface Sector {
  label: string;
  color: string;
  textColor: string;
  value: number;
  type: 'USDT' | 'CRYSTALS' | 'SPEED' | 'JACKPOT';
  icon: string;
}

interface GoldCoin {
  id: number;
  x: number;
  y: number;
  vy: number;
  vx: number;
  rotation: number;
  rotSpeed: number;
  scale: number;
  symbol: string;
  color: string;
}

const SECTORS: Sector[] = [
  { label: '₮0.05', color: 'rgba(0, 230, 118, 0.15)', textColor: '#00e676', value: 0.05, type: 'USDT', icon: '₮' },
  { label: '5💎', color: 'rgba(255, 255, 255, 0.05)', textColor: '#ffffff', value: 5, type: 'CRYSTALS', icon: '💎' },
  { label: '×1.2', color: 'rgba(255, 179, 0, 0.15)', textColor: '#ffb300', value: 1.2, type: 'SPEED', icon: '⚡' },
  { label: '₮0.25', color: 'rgba(0, 230, 118, 0.25)', textColor: '#00e676', value: 0.25, type: 'USDT', icon: '₮' },
  { label: '25💎', color: 'rgba(255, 255, 255, 0.08)', textColor: '#ffffff', value: 25, type: 'CRYSTALS', icon: '💎' },
  { label: '×1.5', color: 'rgba(255, 179, 0, 0.25)', textColor: '#ffb300', value: 1.5, type: 'SPEED', icon: '⚡' },
  { label: '100💎', color: 'rgba(244, 67, 54, 0.15)', textColor: '#f44336', value: 100, type: 'CRYSTALS', icon: '💎' },
  { label: 'JACKPOT', color: 'rgba(212, 175, 55, 0.25)', textColor: '#d4af37', value: 5.00, type: 'JACKPOT', icon: '🏆' },
];

export const RouletteGame: React.FC<RouletteGameProps> = ({ onClose, showToast }) => {
  const { crystalsBalance, updateBalance } = useWalletStore();
  const { incrementProgress, incrementCategoryProgress } = useQuestStore();

  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [prize, setPrize] = useState<Sector | null>(null);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [tickerBounce, setTickerBounce] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; color: string; size: number }>>([]);
  const [coins, setCoins] = useState<GoldCoin[]>([]);
  const [displayedValue, setDisplayedValue] = useState(0);

  const spinCost = 5;
  const currentAngle = useRef(0);
  const animFrame = useRef<number | null>(null);

  // Soundless tick physics feedback
  const lastSectorPassed = useRef(-1);

  // Count up value when prize is won
  useEffect(() => {
    if (showPrizeModal && prize) {
      let start = 0;
      const end = prize.value;
      const duration = 1500; // ms
      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuad = progress * (2 - progress);
        const val = start + (end - start) * easeOutQuad;
        setDisplayedValue(val);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          setDisplayedValue(end);
        }
      };
      requestAnimationFrame(step);
    }
  }, [showPrizeModal, prize]);

  // Coin fall animation loop when showing won rewards
  useEffect(() => {
    if (!showPrizeModal) {
      if (coins.length > 0) setCoins([]);
      return;
    }

    let coinAnimId: number;

    const updateCoins = () => {
      setCoins((prevCoins) =>
        prevCoins
          .map((c) => ({
            ...c,
            y: c.y + c.vy,
            x: c.x + c.vx,
            rotation: c.rotation + c.rotSpeed,
          }))
          .filter((c) => c.y < window.innerHeight + 50)
      );
      coinAnimId = requestAnimationFrame(updateCoins);
    };

    coinAnimId = requestAnimationFrame(updateCoins);
    return () => cancelAnimationFrame(coinAnimId);
  }, [showPrizeModal, coins.length]);

  const spawnParticles = (type: string) => {
    // Blast standard star particles
    const list: Array<{ id: number; x: number; y: number; color: string; size: number }> = [];
    const colors = ['#00e676', '#ffb300', '#00e5ff', '#ff007f', '#d4af37'];
    for (let i = 0; i < 40; i++) {
      list.push({
        id: Date.now() + i,
        x: Math.random() * 200 - 100,
        y: Math.random() * 200 - 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 4,
      });
    }
    setParticles(list);

    // Spawn 30 falling physical coins/gems
    const fallingCoinsList: GoldCoin[] = [];
    const isCrypto = type === 'USDT' || type === 'JACKPOT';
    const symbol = isCrypto ? '₮' : '💎';
    const color = isCrypto ? '#00e676' : '#00e5ff';

    for (let i = 0; i < 28; i++) {
      fallingCoinsList.push({
        id: Math.random() + i,
        x: Math.random() * window.innerWidth,
        y: -100 - Math.random() * 400,
        vy: Math.random() * 4 + 3,
        vx: (Math.random() - 0.5) * 3,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 6,
        scale: Math.random() * 0.4 + 0.7,
        symbol,
        color,
      });
    }
    setCoins(fallingCoinsList);
  };

  const handleSpin = () => {
    if (spinning) return;
    if (crystalsBalance < spinCost) {
      showToast('Not enough Crystals! Complete quests to earn more.', 'error');
      return;
    }

    // Deduct cost
    updateBalance({ crystalsBalance: crystalsBalance - spinCost });
    setSpinning(true);
    setPrize(null);
    setParticles([]);
    setCoins([]);

    // Weighted random selection - premium rewards are rare
    const weights = [40, 25, 15, 10, 5, 3, 1.5, 0.5]; // Common to rare
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    let sectorIndex = 0;
    
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        sectorIndex = i;
        break;
      }
    }
    
    const selectedSector = SECTORS[sectorIndex];
    
    // Check for premium reward cooldown (JACKPOT, 100💎, 25💎, ₮0.25)
    const isPremium = selectedSector.type === 'JACKPOT' || 
                      (selectedSector.type === 'CRYSTALS' && selectedSector.value >= 25) ||
                      (selectedSector.type === 'USDT' && selectedSector.value >= 0.25);
    
    if (isPremium) {
      const cooldownKey = `wheel_premium_cooldown_${selectedSector.type}_${selectedSector.value}`;
      const lastWin = localStorage.getItem(cooldownKey);
      const cooldownPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
      
      if (lastWin && Date.now() - parseInt(lastWin) < cooldownPeriod) {
        // Reroll to a non-premium reward
        const nonPremiumIndices = SECTORS.map((s, i) => ({ s, i }))
          .filter(({ s }) => s.type !== 'JACKPOT' && !(s.type === 'CRYSTALS' && s.value >= 25) && !(s.type === 'USDT' && s.value >= 0.25))
          .map(({ i }) => i);
        const fallbackIndex = nonPremiumIndices[Math.floor(Math.random() * nonPremiumIndices.length)];
        sectorIndex = fallbackIndex;
      }
    }

    const sectorDegrees = 360 / SECTORS.length;
    const targetDegrees = 360 * 6 + (360 - sectorIndex * sectorDegrees) - sectorDegrees / 2;

    const duration = 5000;
    const startTime = performance.now();
    const startRotation = rotation % 360;

    const animateWheel = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function: cubic ease-out
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
      const currentRot = startRotation + (targetDegrees - startRotation) * easeOut(progress);

      setRotation(currentRot);
      currentAngle.current = currentRot;

      // Determine which sector is currently under the pointer
      const relativeAngle = (currentRot + 90) % 360;
      const currentSectorIdx = Math.floor(((360 - relativeAngle) % 360) / sectorDegrees);

      if (currentSectorIdx !== lastSectorPassed.current) {
        lastSectorPassed.current = currentSectorIdx;
        setTickerBounce(true);
        setTimeout(() => setTickerBounce(false), 50);
      }

      if (progress < 1) {
        animFrame.current = requestAnimationFrame(animateWheel);
      } else {
        // Spin finished
        setSpinning(false);
        setPrize(selectedSector);
        setShowPrizeModal(true);
        spawnParticles(selectedSector.type);

        // Credit rewards
        if (selectedSector.type === 'CRYSTALS') {
          updateBalance({ crystalsBalance: useWalletStore.getState().crystalsBalance + selectedSector.value });
        } else if (selectedSector.type === 'USDT' || selectedSector.type === 'JACKPOT') {
          updateBalance({ usdtBalance: useWalletStore.getState().usdtBalance + selectedSector.value });
        } else if (selectedSector.type === 'SPEED') {
          showToast(`Miner multiplier boosted to ${selectedSector.value}x!`, 'success');
        }

        // Set cooldown for premium rewards
        const isPremium = selectedSector.type === 'JACKPOT' || 
                          (selectedSector.type === 'CRYSTALS' && selectedSector.value >= 25) ||
                          (selectedSector.type === 'USDT' && selectedSector.value >= 0.25);
        if (isPremium) {
          const cooldownKey = `wheel_premium_cooldown_${selectedSector.type}_${selectedSector.value}`;
          localStorage.setItem(cooldownKey, Date.now().toString());
        }

        // Quests increment
        incrementCategoryProgress('Games', 1);
        incrementProgress('q19', 1);
        incrementProgress('q20', 1);
      }
    };

    animFrame.current = requestAnimationFrame(animateWheel);
  };

  useEffect(() => {
    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
    };
  }, []);

  const resetWheel = () => {
    setRotation(rotation % 360);
    setShowPrizeModal(false);
    setPrize(null);
    setParticles([]);
    setCoins([]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050608]/95 backdrop-blur-xl flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[420px] relative flex flex-col items-center">
        
        {/* Top Header */}
        <div className="w-full flex items-center justify-between mb-6 px-4">
          <div>
            <h2 className="text-xl font-black text-white tracking-wide flex items-center gap-1.5">
              <Sparkles size={20} className="text-gold" />
              CRYPTO ROULETTE
            </h2>
            <p className="text-xs text-text-tertiary">Spin the wheel to win premium rewards</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary active:scale-95 transition-transform"
          >
            <X size={20} />
          </button>
        </div>

        {/* Balance Status card */}
        <div className="w-[92%] bg-gradient-to-r from-white/[0.04] to-white/[0.01] border border-white/10 rounded-2xl py-3.5 px-4 flex items-center justify-between mb-8 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">Your Crystals:</span>
            <span className="font-mono text-sm text-[#a7ffeb] font-extrabold flex items-center gap-1">
              💎 {crystalsBalance}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">Cost:</span>
            <span className="font-mono text-sm text-gold font-extrabold flex items-center gap-1">
              💎 {spinCost}
            </span>
          </div>
        </div>

        {/* The Wheel Stage */}
        <div className="relative w-[310px] h-[310px] mb-10 flex items-center justify-center">
          <div className="absolute inset-[-15px] rounded-full bg-[#00e676]/5 blur-2xl pointer-events-none" />

          {/* Outer ring frame */}
          <div className="absolute inset-0 rounded-full border-4 border-white/10 shadow-[0_0_40px_rgba(0,230,118,0.2)] flex items-center justify-center bg-gradient-to-b from-[#181a24] to-[#0e1017]">
            {/* LED Bulb indicators */}
            {[...Array(16)].map((_, i) => (
              <div
                key={i}
                className={`absolute w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  spinning
                    ? i % 2 === Math.floor(rotation / 45) % 2
                      ? 'bg-usdt-green shadow-[0_0_8px_#00e676]'
                      : 'bg-gold shadow-[0_0_8px_#ffb300]'
                    : 'bg-white/20'
                }`}
                style={{
                  transform: `rotate(${i * 22.5}deg) translateY(-148px)`,
                }}
              />
            ))}
          </div>

          {/* Pointer/Ticker */}
          <motion.div
            animate={{ rotate: tickerBounce ? -15 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
            className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 w-8 h-10 flex flex-col items-center filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]"
            style={{ transformOrigin: 'top center' }}
          >
            <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-error-red" />
            <div className="w-4 h-4 rounded-full bg-white border border-error-red -mt-[26px]" />
          </motion.div>

          {/* Rotating Disk */}
          <div
            className="w-[288px] h-[288px] rounded-full overflow-hidden relative border-2 border-white/10 shadow-[inset_0_4px_20px_rgba(0,0,0,0.6)] bg-[#0d0e14] z-10"
            style={{
              transform: `rotate(${rotation}deg)`,
            }}
          >
            {/* Slices */}
            {SECTORS.map((sector, idx) => {
              const deg = 360 / SECTORS.length;
              const isJackpot = sector.type === 'JACKPOT';
              return (
                <div
                  key={idx}
                  className="absolute top-0 right-0 w-[144px] h-[144px] origin-bottom-left"
                  style={{
                    transform: `rotate(${idx * deg}deg)`,
                    background: isJackpot
                      ? 'radial-gradient(circle at 100% 100%, rgba(212,175,55,0.4) 0%, rgba(21,18,8,0.9) 100%)'
                      : 'radial-gradient(circle at 100% 100%, rgba(255,255,255,0.06) 0%, rgba(13,14,20,0.95) 100%)',
                    borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div
                    className="absolute bottom-4 left-6 origin-bottom-left flex flex-col items-center gap-1"
                    style={{
                      transform: `rotate(${deg / 2}deg) translate(30px, 45px) rotate(90deg)`,
                      color: sector.textColor,
                    }}
                  >
                    <span className="text-base">{sector.icon}</span>
                    <span className="font-extrabold text-[9px] whitespace-nowrap tracking-tight leading-none uppercase">
                      {sector.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center Hub button */}
          <button
            onClick={handleSpin}
            disabled={spinning}
            className="absolute z-20 w-18 h-18 rounded-full bg-gradient-to-b from-[#2d3043] to-[#12131a] border border-white/15 shadow-[0_6px_20px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.1)] flex flex-col items-center justify-center active:scale-95 transition-transform disabled:opacity-90 animate-breathe"
          >
            <span className="text-[10px] font-black tracking-widest text-[#00e676] animate-pulse">SPIN</span>
            <span className="text-[8px] font-bold text-text-tertiary uppercase leading-none mt-0.5">Start</span>
          </button>
        </div>

        {/* Footer tips */}
        <p className="text-xs text-text-tertiary text-center max-w-[280px]">
          Jackpots and USDT cash drops are updated immediately in your wallet.
        </p>

        {/* Dynamic Fall Coins Container in screen layer */}
        {showPrizeModal && coins.length > 0 && (
          <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden">
            {coins.map((c) => (
              <div
                key={c.id}
                className="absolute flex items-center justify-center select-none font-bold font-mono"
                style={{
                  transform: `translate(${c.x}px, ${c.y}px) rotate(${c.rotation}deg) scale(${c.scale})`,
                  color: c.color,
                  fontSize: c.symbol === '₮' ? '28px' : '22px',
                  textShadow: `0 0 10px ${c.color}aa, 0 4px 12px rgba(0,0,0,0.6)`,
                }}
              >
                {c.symbol}
              </div>
            ))}
          </div>
        )}

        {/* Particles and Win Modal */}
        <AnimatePresence>
          {showPrizeModal && prize && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-[#050608]/96 flex flex-col items-center justify-center p-6 overflow-hidden"
            >
              {/* Spinning Rotary Sunburst Rays Background */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-25">
                <div className="w-[500px] h-[500px] rounded-full border border-white/5 bg-[radial-gradient(circle,_rgba(255,255,255,0.06)_0%,_transparent_70%)] animate-spin-slow" />
                <svg className="absolute w-[500px] h-[500px] animate-spin-slow" viewBox="0 0 100 100" style={{ animationDuration: '24s' }}>
                  {[...Array(12)].map((_, i) => (
                    <polygon
                      key={i}
                      points="50,50 43,0 57,0"
                      fill={prize.type === 'USDT' || prize.type === 'JACKPOT' ? '#00e676' : '#00e5ff'}
                      opacity="0.15"
                      transform={`rotate(${i * 30} 50 50)`}
                    />
                  ))}
                </svg>
              </div>

              {/* Particle burst animation */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {particles.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                    animate={{
                      x: p.x * 2.5,
                      y: p.y * 2.5,
                      scale: 0,
                      opacity: 0,
                    }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    className="absolute rounded-full"
                    style={{
                      width: p.size,
                      height: p.size,
                      backgroundColor: p.color,
                      boxShadow: `0 0 10px ${p.color}`,
                    }}
                  />
                ))}
              </div>

              <motion.div
                initial={{ scale: 0.8, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-[340px] bg-gradient-to-b from-[#1c1d29] to-[#0d0e15] border border-white/15 rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl relative"
              >
                {/* Spotlight background */}
                <div className="absolute inset-x-0 -top-12 h-24 bg-usdt-green/10 blur-xl rounded-full pointer-events-none" />

                <div className="w-16 h-16 rounded-2xl bg-usdt-green/10 border border-usdt-green/30 flex items-center justify-center text-usdt-green mb-4 shadow-[0_0_20px_rgba(0,230,118,0.2)]">
                  <Sparkles size={32} className="animate-pulse" />
                </div>
                
                <h3 className="text-2xl font-black text-white tracking-wide uppercase">
                  {prize.type === 'JACKPOT' ? '🔥 MEGA WIN! 🔥' : 'CONGRATULATIONS!'}
                </h3>
                <p className="text-xs text-text-secondary mt-1 mb-6">You spun the wheel and won a premium reward:</p>

                {/* Legend Reward Card */}
                <div className="w-full bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 rounded-2xl px-6 py-5 mb-8 shadow-inner flex flex-col items-center justify-center relative overflow-hidden">
                  
                  {/* Rotating inner light flare */}
                  <div className="absolute w-24 h-24 rounded-full bg-[#00e676]/10 blur-xl -top-6 -right-6 pointer-events-none" />

                  <span className="text-4xl mb-2 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">{prize.icon}</span>
                  
                  {/* Dynamic Count-Up Value text */}
                  <span className="text-3xl font-mono font-black text-usdt-green tracking-wide">
                    {prize.type === 'USDT' || prize.type === 'JACKPOT' ? '₮ ' : ''}
                    {displayedValue.toFixed(prize.type === 'USDT' || prize.type === 'JACKPOT' ? 2 : 0)}
                    {prize.type === 'CRYSTALS' ? ' 💎' : ''}
                    {prize.type === 'SPEED' ? 'x Boost ⚡' : ''}
                  </span>

                  <span className="text-[10px] text-text-tertiary mt-1.5 uppercase font-bold tracking-wider">
                    {prize.label} Credited
                  </span>
                </div>

                <button
                  onClick={resetWheel}
                  className="w-full py-4 btn-glossy-primary rounded-xl text-sm font-bold tracking-wider"
                >
                  AWESOME
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
