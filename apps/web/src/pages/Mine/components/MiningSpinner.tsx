import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMiningStore } from '../../../store/useMiningStore';
import { useWalletStore } from '../../../store/useWalletStore';
import { useQuestStore } from '../../../store/useQuestStore';
import { useHaptics } from '../../../hooks/useHaptics';
import { Flame, Thermometer, ChevronLeft, ChevronRight, Lock, Clock } from 'lucide-react';
import { showToast } from '../../../components/Toast';
import { useNavigationStore } from '../../../store/useNavigationStore';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  text: string;
}

interface SmokeParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
}

import { MACHINE_CATALOG, getMachineYieldDetails, type FrontendMachineModel } from '../../../data/machines';

interface SpinnerModel {
  id: string;
  tierCode: string;
  name: string;
  desc: string;
  technicalSummary: string;
  simpleExplanation: string;
  icon: string;
  color: string;
  minBoostGhs: number;
  baseSpeedMultiplier: number;
  payoutMultiplier: number;
  spinDurationSeconds: number; // Calibrated animation speed: lower duration = faster spin!
  powerRatingW: number;
  dailyYieldUsdt: number;
}

const USDT_SPINNERS: SpinnerModel[] = MACHINE_CATALOG.map((m, idx) => {
  // Calibrate spin animation duration: TS Compute C10 = 4.2s, TS Vector V1000 = 0.8s
  const spinDurationSeconds = Math.max(0.8, 4.5 / m.spinnerSpeedMultiplier);
  return {
    id: m.id,
    tierCode: m.tierCode,
    name: m.name,
    desc: m.description,
    technicalSummary: m.technicalSummary,
    simpleExplanation: m.simpleExplanation,
    icon: m.icon,
    color: m.tierCode === 'TS_C10' ? '#26a17b'
         : m.tierCode === 'TS_A50' ? '#ff9100'
         : m.tierCode === 'TS_P250' ? '#10b981'
         : m.tierCode === 'TS_X1000' ? '#e040fb'
         : '#00b0ff',
    minBoostGhs: idx === 0 ? 0 : m.capacityGhs,
    baseSpeedMultiplier: m.spinnerSpeedMultiplier,
    payoutMultiplier: m.dailyYieldUsdt,
    spinDurationSeconds,
    powerRatingW: m.powerRatingW,
    dailyYieldUsdt: m.dailyYieldUsdt,
  };
});

const TON_SPINNERS: SpinnerModel[] = MACHINE_CATALOG.map((m, idx) => {
  // TON mode compute characteristics: 1.3x speed boost with quantum blue pulse (duration 0.6s to 3.2s)
  const spinDurationSeconds = Math.max(0.6, 3.6 / (m.spinnerSpeedMultiplier * 1.25));
  return {
    id: `ton-${m.id}`,
    tierCode: m.tierCode,
    name: `TON ${m.name}`,
    desc: `TON-optimized ${m.description.toLowerCase()}`,
    technicalSummary: m.technicalSummary,
    simpleExplanation: `TON Node: ${m.simpleExplanation}`,
    icon: '💎',
    color: m.tierCode === 'TS_C10' ? '#00b0ff'
         : m.tierCode === 'TS_A50' ? '#00e5ff'
         : m.tierCode === 'TS_P250' ? '#3f51b5'
         : m.tierCode === 'TS_X1000' ? '#7c4dff'
         : '#00e676',
    minBoostGhs: idx === 0 ? 0 : m.capacityGhs * 1.2,
    baseSpeedMultiplier: m.spinnerSpeedMultiplier * 1.25,
    payoutMultiplier: m.dailyYieldUsdt * 1.15,
    spinDurationSeconds,
    powerRatingW: Math.round(m.powerRatingW * 1.1),
    dailyYieldUsdt: m.dailyYieldUsdt * 1.15,
  };
});

export const MiningSpinner: React.FC = () => {
  const { 
    activeCurrency, 
    tap, 
    coolerMultiplier, 
    maxMultiplier,
    isOverheated,
    cooldownTimer,
    tickCooldown,
    decay, 
    baseSpeedGhs,
    tapsToday,
    tapsThisWeek,
    tapsThisMonth,
    dailyTapLimit,
    weeklyTapLimit,
    monthlyTapLimit,
    usdtSpinnerIdx,
    tonSpinnerIdx,
    setUsdtSpinnerIdx,
    setTonSpinnerIdx,
    hasPurchasedMachine,
    isTrialActive,
    isTrialExpired,
    getTrialRemainingMs,
    trialEarnings
  } = useMiningStore();
  const { setActiveTab } = useNavigationStore();

  const [trialTimeStr, setTrialTimeStr] = useState('');

  // Live 24h Free Trial countdown timer
  useEffect(() => {
    if (hasPurchasedMachine) return;
    const updateTimer = () => {
      const ms = getTrialRemainingMs();
      if (ms <= 0) {
        setTrialTimeStr('0h 0m');
        return;
      }
      const totalSecs = Math.floor(ms / 1000);
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      setTrialTimeStr(`${hrs}H ${mins}M ${secs}S`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [hasPurchasedMachine, getTrialRemainingMs]);

  const isDailyLimitReached = tapsToday >= dailyTapLimit;
  const isWeeklyLimitReached = tapsThisWeek >= weeklyTapLimit;
  const isMonthlyLimitReached = tapsThisMonth >= monthlyTapLimit;

  const isAnyLimitReached = isDailyLimitReached || isWeeklyLimitReached || isMonthlyLimitReached;
  const isUsdt = activeCurrency === 'USDT';
  const { impactOccurred } = useHaptics();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [smoke, setSmoke] = useState<SmokeParticle[]>([]);
  
  // Retrieve active spinner values from store
  const activeSpinners = isUsdt ? USDT_SPINNERS : TON_SPINNERS;
  const activeSpinnerIdx = isUsdt ? usdtSpinnerIdx : tonSpinnerIdx;
  const activeSpinner = activeSpinners[activeSpinnerIdx];

  const [fanRotation, setFanRotation] = useState(0);

  // Smooth decay mechanism (ticks down every 100ms)
  useEffect(() => {
    const interval = setInterval(() => {
      decay();
    }, 100);
    return () => clearInterval(interval);
  }, [decay]);

  // Cooldown interval timer (ticks down every 1 second when overheated)
  useEffect(() => {
    if (!isOverheated) return;
    const timer = setInterval(() => {
      tickCooldown();
    }, 1000);
    return () => clearInterval(timer);
  }, [isOverheated, tickCooldown]);

  // Fan spinning speed matching multiplier - currency-specific
  useEffect(() => {
    let animFrame: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      const baseSpeed = 0.05 * activeSpinner.baseSpeedMultiplier;
      const rotationSpeed = (isAnyLimitReached || isOverheated) ? 0 : (baseSpeed + coolerMultiplier * 0.08 * activeSpinner.baseSpeedMultiplier) * delta;
      setFanRotation((prev) => (prev + rotationSpeed) % 360);

      animFrame = requestAnimationFrame(animate);
    };

    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [coolerMultiplier, isAnyLimitReached, isOverheated, activeSpinner.baseSpeedMultiplier]);

  // Heat smoke generation when multiplier is high or overheated
  useEffect(() => {
    if (coolerMultiplier < 6.0 && !isOverheated) {
      if (smoke.length > 0) setSmoke([]);
      return;
    }

    const interval = setInterval(() => {
      setSmoke((prev) => [
        ...prev.map((s) => ({
          ...s,
          y: s.y - 1.5,
          x: s.x + (Math.random() - 0.5) * 1.2,
          opacity: s.opacity - 0.05,
          size: s.size + 0.3,
        })).filter((s) => s.opacity > 0),
        {
          id: Math.random() + Date.now(),
          x: (Math.random() - 0.5) * 30,
          y: (Math.random() - 0.5) * 30 - 20,
          size: Math.random() * 4 + 4,
          opacity: 0.8,
        },
      ]);
    }, 80);

    return () => clearInterval(interval);
  }, [coolerMultiplier, isOverheated, smoke.length]);

  // Live coin particle physics updating loop
  useEffect(() => {
    if (particles.length === 0) return;

    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            y: p.y + p.vy,
            x: p.x + p.vx,
            vy: p.vy + 0.12, // gravity pulls them down
            rotation: p.rotation + p.rotSpeed,
          }))
          .filter((p) => p.y < 350)
      );
    }, 30);

    return () => clearInterval(interval);
  }, [particles.length]);

  const { updateBalance } = useWalletStore();

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isOverheated || coolerMultiplier >= maxMultiplier) {
      impactOccurred('heavy');
      showToast(`🔥 Spinner overheated! Cool down period active (${cooldownTimer || 15}s). No funds credited.`, 'error');
      return;
    }

    if (isAnyLimitReached) {
      impactOccurred('heavy');
      showToast(`Cooler threshold reached! Upgrade limit to resume.`, 'error');
      return;
    }

    if (baseSpeedGhs < activeSpinner.minBoostGhs) {
      impactOccurred('heavy');
      showToast(`This Machine tier is locked! Redirecting to the Cloud Machines hub.`, 'info');
      setActiveTab('boost');
      return;
    }

    const tapSuccess = tap();
    if (!tapSuccess) {
      impactOccurred('heavy');
      showToast(`🔥 Spinner overheated! Cooler bar is full. Waiting for cool down.`, 'error');
      return;
    }

    impactOccurred('medium');

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const currentMultiplier = useMiningStore.getState().coolerMultiplier;
    const miningStoreState = useMiningStore.getState();

    let tapPayout = 0.02;
    if (!hasPurchasedMachine && isTrialActive()) {
      const remainingCap = Math.max(0, 5.0 - miningStoreState.trialEarnings);
      tapPayout = Math.min(0.02, remainingCap);
    } else {
      tapPayout = 0.01 * currentMultiplier * (activeSpinner.payoutMultiplier || 1.0);
    }

    // Credit directly to the wallet store so the odometer display instantly reflects the tap
    const wallet = useWalletStore.getState();
    if (isUsdt) {
      updateBalance({ usdtBalance: wallet.usdtBalance + tapPayout });
    } else {
      updateBalance({ tonBalance: wallet.tonBalance + tapPayout });
    }

    // Increment Taps category progress for Quest Store
    useQuestStore.getState().incrementCategoryProgress('Taps', 1);

    // Dynamic trust score from user actions: +1 for every 50 taps
    const newTapsCount = tapsToday + 1;
    if (newTapsCount % 50 === 0) {
      useTreasuryStore.getState().adjustTrustScore(1);
      showToast("Trust Score increased! Thank you for maintaining active compute operations. 🛡️", "info");
    }

    const newParticle: Particle = {
      id: Date.now() + Math.random(),
      x: x + (Math.random() * 20 - 10),
      y: y - 10,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 5 - 4,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      text: `+${(Number(tapPayout) || 0).toFixed(4)} ${activeCurrency}`,
    };

    setParticles((prev) => [...prev.slice(-12), newParticle]);
  };

  const temperature = Math.min(99.9, 30 + (coolerMultiplier - 1.0) * 3.2);

  // Derive dynamic color by blending currency theme and chosen spinner baseline theme color
  let dynamicColor = activeSpinner.color;
  if (isOverheated || temperature > 70) {
    dynamicColor = '#ff1744';
  } else if (temperature > 50) {
    const factor = Math.min(1.0, (temperature - 50) / 40);
    if (isUsdt) {
      dynamicColor = factor > 0.6 ? '#ff1744' : '#ff5722';
    } else {
      dynamicColor = factor > 0.6 ? '#d500f9' : '#00e5ff';
    }
  }

  const prevSpinner = () => {
    impactOccurred('light');
    if (isUsdt) {
      const prevVal = usdtSpinnerIdx === 0 ? USDT_SPINNERS.length - 1 : usdtSpinnerIdx - 1;
      setUsdtSpinnerIdx(prevVal);
    } else {
      const prevVal = tonSpinnerIdx === 0 ? TON_SPINNERS.length - 1 : tonSpinnerIdx - 1;
      setTonSpinnerIdx(prevVal);
    }
  };

  const nextSpinner = () => {
    impactOccurred('light');
    if (isUsdt) {
      const nextVal = usdtSpinnerIdx === USDT_SPINNERS.length - 1 ? 0 : usdtSpinnerIdx + 1;
      setUsdtSpinnerIdx(nextVal);
    } else {
      const nextVal = tonSpinnerIdx === TON_SPINNERS.length - 1 ? 0 : tonSpinnerIdx + 1;
      setTonSpinnerIdx(nextVal);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center my-4 py-2 select-none w-full">
      
      {/* Ambient background glow aura */}
      <div
        className="absolute w-[290px] h-[290px] rounded-full blur-3xl opacity-45 pointer-events-none transition-all duration-500"
        style={{
          background: `radial-gradient(circle, ${dynamicColor} 0%, rgba(0,0,0,0) 70%)`,
        }}
      />

      {/* Overheat warning / Free Trial banner overlay */}
      {isOverheated ? (
        <div className="mb-3.5 z-20 bg-rose-600/30 border border-rose-500 text-rose-300 text-[10px] font-black px-4 py-1.5 rounded-full flex items-center gap-1.5 uppercase tracking-widest shadow-xl animate-pulse backdrop-blur-md">
          <Flame size={14} className="animate-bounce text-rose-400" />
          <span>OVERHEATED — COOLING DOWN ({cooldownTimer}s)</span>
        </div>
      ) : !hasPurchasedMachine ? (
        <div className={`mb-3.5 z-20 text-[10px] font-black px-4 py-1.5 rounded-full flex items-center gap-1.5 uppercase tracking-wider shadow-lg backdrop-blur-md transition-all ${
          isTrialActive() 
            ? 'bg-usdt-green/15 border border-usdt-green/40 text-usdt-green shadow-[0_0_12px_rgba(38,161,123,0.25)]' 
            : 'bg-rose-500/20 border border-rose-500/40 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
        }`}>
          {isTrialActive() ? (
            <>
              <Clock size={13} className="animate-pulse text-usdt-green shrink-0" />
              <span>
                {trialEarnings >= 5.0
                  ? `FREE TRIAL CAP REACHED ($5.00 MAX)`
                  : `FREE TRIAL ACTIVE • ${trialTimeStr} LEFT ($${(Number(trialEarnings) || 0).toFixed(2)}/$5.00)`}
              </span>
            </>
          ) : (
            <>
              <Lock size={13} className="text-rose-400 shrink-0" />
              <span>TRIAL EXPIRED — MACHINE REQUIRED</span>
            </>
          )}
        </div>
      ) : temperature > 70 ? (
        <div className="mb-3.5 z-20 bg-error-red/20 border border-error-red/40 text-error-red text-[9px] font-black px-3.5 py-1.5 rounded-full flex items-center gap-1 uppercase tracking-widest shadow-lg animate-pulse backdrop-blur-md">
          <Flame size={12} className="animate-bounce" /> OVERCLOCK ACTIVE
        </div>
      ) : null}

      {/* Interactive coin physics display overlays */}
      <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center overflow-visible">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute flex flex-col items-center justify-center transition-opacity duration-300"
            style={{
              transform: `translate(${p.x}px, ${p.y}px)`,
              opacity: p.y > 250 ? 0 : 1, // fade near bottom
            }}
          >
            {/* Visual Coin Icon */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center font-black text-sm border shadow-lg"
              style={{
                transform: `rotate(${p.rotation}deg)`,
                backgroundColor: `${dynamicColor}15`,
                borderColor: dynamicColor,
                color: dynamicColor,
                textShadow: `0 0 8px ${dynamicColor}`,
                boxShadow: `0 0 10px ${dynamicColor}40`,
              }}
            >
              {isUsdt ? '₮' : '�'}
            </div>

            {/* Float value text tag */}
            <span
              className="font-black text-[10px] font-mono whitespace-nowrap mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] px-1.5 py-0.5 rounded-md bg-[#090b11]/80 border border-white/5"
              style={{ color: dynamicColor }}
            >
              {p.text}
            </span>
          </div>
        ))}
      </div>

      {/* MAIN TURBINE INTERACTIVE WHEEL CONTAINER */}
      <div className="flex items-center justify-between w-full max-w-[320px] relative px-1">
        {/* Left selector arrow */}
        <button
          onClick={prevSpinner}
          className="press-feedback w-9 h-9 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-all z-20 shadow-md"
        >
          <ChevronLeft size={18} />
        </button>

        <motion.div
          onClick={handleTap}
          whileTap={baseSpeedGhs >= activeSpinner.minBoostGhs ? { scale: 0.93 } : { scale: 1.0 }}
          className="relative w-[216px] h-[216px] rounded-full glass-panel flex items-center justify-center cursor-pointer shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
          style={{
            boxShadow: `0 0 35px ${dynamicColor}25, inset 0 0 15px ${dynamicColor}10`,
            borderColor: `${dynamicColor}35`,
          }}
        >
          {/* Animated steam/smoke particles */}
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center overflow-visible">
            {smoke.map((s) => (
              <div
                key={s.id}
                className="absolute rounded-full bg-white/10 blur-[2px]"
                style={{
                  width: s.size,
                  height: s.size,
                  transform: `translate(${s.x}px, ${s.y}px)`,
                  opacity: s.opacity,
                }}
              />
            ))}
          </div>

          {/* Liquid Water cooling pipe loop */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <circle
              cx="108"
              cy="108"
              r="98"
              fill="none"
              stroke={`${dynamicColor}20`}
              strokeWidth="3"
            />
            <circle
              cx="108"
              cy="108"
              r="98"
              fill="none"
              stroke={dynamicColor}
              strokeWidth="3.5"
              strokeDasharray="12, 180"
              style={{
                transformOrigin: 'center',
                animation: `spin ${Math.max(0.5, 5 - coolerMultiplier * 0.2)}s linear infinite`,
              }}
            />
          </svg>

          <div className="absolute inset-2.5 rounded-full border border-white/5 pointer-events-none" />

          {/* DYNAMIC SPINNER RENDERING ENGINE */}
          
          {/* 1. Aero BERP Rotor (Helicopter Aerodynamic Blades) */}
          {activeSpinner.id === 'berp-heli' && (
            <>
              {/* Aerodynamic Downwash Airflow Vectors */}
              <div className="absolute inset-0 pointer-events-none z-10">
                <svg className="w-full h-full" viewBox="0 0 216 216">
                  {/* Outer airflow downwash ring */}
                  <circle
                    cx="108"
                    cy="108"
                    r="88"
                    fill="none"
                    stroke={dynamicColor}
                    strokeWidth="1"
                    strokeDasharray="30 160"
                    opacity="0.25"
                    style={{
                      transformOrigin: 'center',
                      animation: `spin ${Math.max(0.25, 3.0 - coolerMultiplier * 0.2)}s linear infinite`,
                    }}
                  />
                  {/* Mid vortex ring (counter-rotating) */}
                  <circle
                    cx="108"
                    cy="108"
                    r="72"
                    fill="none"
                    stroke={dynamicColor}
                    strokeWidth="1.2"
                    strokeDasharray="20 110"
                    opacity="0.3"
                    style={{
                      transformOrigin: 'center',
                      animation: `spin-reverse ${Math.max(0.2, 2.0 - coolerMultiplier * 0.15)}s linear infinite`,
                    }}
                  />
                </svg>
              </div>

              {/* Rotating Impeller */}
              <div
                className="absolute inset-4 rounded-full flex items-center justify-center pointer-events-none"
                style={{
                  transform: `rotate(${fanRotation}deg)`,
                }}
              >
                {[...Array(4)].map((_, i) => {
                  const flexSkew = Math.min(8, (coolerMultiplier - 1) * 1.5);
                  return (
                    <div
                      key={i}
                      className="absolute w-[30px] h-[86px] origin-bottom transition-transform duration-100"
                      style={{
                        bottom: '50%',
                        transform: `rotate(${i * 90}deg) skewX(${flexSkew}deg)`,
                      }}
                    >
                      <svg className="w-full h-full" viewBox="0 0 30 86">
                        <defs>
                          <linearGradient id={`rotorGrad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={dynamicColor} stopOpacity="0.95" />
                            <stop offset="40%" stopColor="#1a1c29" stopOpacity="0.9" />
                            <stop offset="100%" stopColor="#08090d" stopOpacity="0.95" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 13 86 L 12 26 L 7 10 L 2 3 L 14 0 L 22 5 L 20 26 L 18 86 Z"
                          fill={`url(#rotorGrad-${i})`}
                          stroke={`${dynamicColor}40`}
                          strokeWidth="0.5"
                        />
                        <line x1="15" y1="86" x2="13" y2="3" stroke="#ffffff" strokeWidth="0.8" opacity="0.25" />
                        <path d="M 2 3 L 14 0 L 22 5" fill="none" stroke={dynamicColor} strokeWidth="1.5" opacity="0.8" />
                      </svg>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* 2. Cyclone Jet-IV (12-blade dense titanium jet turbine compressor) */}
          {activeSpinner.id === 'jet-turbine' && (
            <>
              {/* Intake air vortex compression rings */}
              <div className="absolute inset-0 pointer-events-none z-10">
                <svg className="w-full h-full" viewBox="0 0 216 216">
                  <circle
                    cx="108"
                    cy="108"
                    r="84"
                    fill="none"
                    stroke={dynamicColor}
                    strokeWidth="1"
                    strokeDasharray="15 60"
                    opacity="0.35"
                    style={{
                      transformOrigin: 'center',
                      animation: `spin-reverse ${Math.max(0.12, 1.5 - coolerMultiplier * 0.08)}s linear infinite`,
                    }}
                  />
                  <circle
                    cx="108"
                    cy="108"
                    r="56"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeDasharray="8 45"
                    opacity="0.45"
                    style={{
                      transformOrigin: 'center',
                      animation: `spin ${Math.max(0.08, 1.0 - coolerMultiplier * 0.05)}s linear infinite`,
                    }}
                  />
                </svg>
              </div>

              {/* Dense Turbine Impeller */}
              <div
                className="absolute inset-6 rounded-full flex items-center justify-center pointer-events-none"
                style={{
                  transform: `rotate(${fanRotation}deg)`,
                }}
              >
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-[14px] h-[78px] origin-bottom rounded-t-sm"
                    style={{
                      bottom: '50%',
                      transform: `rotate(${i * 30}deg) skewY(15deg)`,
                      background: `linear-gradient(180deg, ${dynamicColor} 0%, rgba(10,12,18,0.95) 75%)`,
                      opacity: 0.9,
                      boxShadow: `0 0 6px ${dynamicColor}20`,
                      borderTop: `1px solid ${dynamicColor}`,
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {/* 3. Coaxial Double-Fan (Dual counter-rotating blade systems) */}
          {activeSpinner.id === 'co-axial' && (
            <>
              {/* Flow-lines between rotors */}
              <div className="absolute inset-0 pointer-events-none z-10">
                <svg className="w-full h-full" viewBox="0 0 216 216">
                  <circle
                    cx="108"
                    cy="108"
                    r="76"
                    fill="none"
                    stroke={dynamicColor}
                    strokeWidth="1.5"
                    strokeDasharray="40 90"
                    opacity="0.25"
                    style={{
                      transformOrigin: 'center',
                      animation: `spin ${Math.max(0.3, 2.5 - coolerMultiplier * 0.15)}s linear infinite`,
                    }}
                  />
                </svg>
              </div>

              {/* Outer rotor (Clockwise, 5 Blades) */}
              <div
                className="absolute inset-5 rounded-full flex items-center justify-center pointer-events-none"
                style={{
                  transform: `rotate(${fanRotation}deg)`,
                }}
              >
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-[18px] h-[78px] origin-bottom rounded-t-full"
                    style={{
                      bottom: '50%',
                      transform: `rotate(${i * 72}deg)`,
                      background: `linear-gradient(180deg, ${dynamicColor} 0%, rgba(20,22,30,0.85) 90%)`,
                      opacity: 0.8,
                    }}
                  />
                ))}
              </div>

              {/* Inner rotor (Counter-Clockwise, 5 Blades) */}
              <div
                className="absolute inset-10 rounded-full flex items-center justify-center pointer-events-none z-10"
                style={{
                  transform: `rotate(${-fanRotation * 1.3}deg)`,
                }}
              >
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-[12px] h-[52px] origin-bottom rounded-t-full"
                    style={{
                      bottom: '50%',
                      transform: `rotate(${i * 72}deg)`,
                      background: `linear-gradient(180deg, #ffffff 0%, rgba(20,22,30,0.95) 90%)`,
                      opacity: 0.9,
                      boxShadow: `0 0 6px ${dynamicColor}30`,
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {/* 4. Tesla Induction Ring (Bladeless electromagnetic plasma inductor) */}
          {activeSpinner.id === 'plasma-coil' && (
            <>
              {/* Electromagnetic high-voltage aura */}
              <div className="absolute inset-0 pointer-events-none z-10">
                <svg className="w-full h-full" viewBox="0 0 216 216">
                  {/* Glowing electric arcs */}
                  <circle
                    cx="108"
                    cy="108"
                    r="84"
                    fill="none"
                    stroke={dynamicColor}
                    strokeWidth="3.5"
                    strokeDasharray="60 140"
                    opacity="0.85"
                    style={{
                      transformOrigin: 'center',
                      filter: `drop-shadow(0 0 10px ${dynamicColor})`,
                      animation: `spin ${Math.max(0.1, 1.2 - coolerMultiplier * 0.08)}s linear infinite`,
                    }}
                  />
                  <circle
                    cx="108"
                    cy="108"
                    r="84"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeDasharray="30 200"
                    opacity="0.9"
                    style={{
                      transformOrigin: 'center',
                      filter: `drop-shadow(0 0 6px #ffffff)`,
                      animation: `spin-reverse ${Math.max(0.08, 0.8 - coolerMultiplier * 0.06)}s linear infinite`,
                    }}
                  />
                  
                  {/* Secondary thin induction field */}
                  <circle
                    cx="108"
                    cy="108"
                    r="68"
                    fill="none"
                    stroke={dynamicColor}
                    strokeWidth="1"
                    strokeDasharray="10 80"
                    opacity="0.5"
                    style={{
                      transformOrigin: 'center',
                      animation: `spin ${Math.max(0.05, 0.6 - coolerMultiplier * 0.04)}s linear infinite`,
                    }}
                  />
                </svg>
              </div>

              {/* Spark animations or plasma tracers */}
              <div className="absolute inset-8 rounded-full border border-dashed border-[#e040fb]/30 animate-pulse pointer-events-none" />
            </>
          )}

          {/* TON-SPECIFIC SPINNERS */}

          {/* 1. Quantum Core V1 (Blockchain-optimized processing unit) */}
          {activeSpinner.id === 'quantum-core' && (
            <>
              {/* Quantum entanglement rings */}
              <div className="absolute inset-0 pointer-events-none z-10">
                <svg className="w-full h-full" viewBox="0 0 216 216">
                  {/* Outer quantum field */}
                  <circle
                    cx="108"
                    cy="108"
                    r="88"
                    fill="none"
                    stroke={dynamicColor}
                    strokeWidth="2"
                    strokeDasharray="40 120"
                    opacity="0.4"
                    style={{
                      transformOrigin: 'center',
                      animation: `spin ${Math.max(0.2, 2.5 - coolerMultiplier * 0.15)}s linear infinite`,
                    }}
                  />
                  {/* Inner quantum core */}
                  <circle
                    cx="108"
                    cy="108"
                    r="64"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    strokeDasharray="20 80"
                    opacity="0.6"
                    style={{
                      transformOrigin: 'center',
                      animation: `spin-reverse ${Math.max(0.15, 1.8 - coolerMultiplier * 0.12)}s linear infinite`,
                    }}
                  />
                </svg>
              </div>

              {/* Hexagonal quantum processor */}
              <div
                className="absolute inset-6 rounded-full flex items-center justify-center pointer-events-none"
                style={{
                  transform: `rotate(${fanRotation}deg)`,
                }}
              >
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-[24px] h-[70px] origin-bottom"
                    style={{
                      bottom: '50%',
                      transform: `rotate(${i * 60}deg)`,
                      background: `linear-gradient(180deg, ${dynamicColor} 0%, rgba(0,176,255,0.3) 100%)`,
                      opacity: 0.85,
                      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                      boxShadow: `0 0 8px ${dynamicColor}30`,
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {/* 2. Neural Network Grid (AI-driven distributed computing) */}
          {activeSpinner.id === 'neural-net' && (
            <>
              {/* Neural network connections */}
              <div className="absolute inset-0 pointer-events-none z-10">
                <svg className="w-full h-full" viewBox="0 0 216 216">
                  {/* Outer synapse ring */}
                  <circle
                    cx="108"
                    cy="108"
                    r="82"
                    fill="none"
                    stroke={dynamicColor}
                    strokeWidth="1.5"
                    strokeDasharray="25 70"
                    opacity="0.35"
                    style={{
                      transformOrigin: 'center',
                      animation: `spin ${Math.max(0.18, 2.2 - coolerMultiplier * 0.14)}s linear infinite`,
                    }}
                  />
                  {/* Inner neural pathways */}
                  <circle
                    cx="108"
                    cy="108"
                    r="58"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1"
                    strokeDasharray="15 50"
                    opacity="0.5"
                    style={{
                      transformOrigin: 'center',
                      animation: `spin-reverse ${Math.max(0.12, 1.5 - coolerMultiplier * 0.1)}s linear infinite`,
                    }}
                  />
                </svg>
              </div>

              {/* Neural node array */}
              <div
                className="absolute inset-5 rounded-full flex items-center justify-center pointer-events-none"
                style={{
                  transform: `rotate(${fanRotation}deg)`,
                }}
              >
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-[16px] h-[72px] origin-bottom rounded-full"
                    style={{
                      bottom: '50%',
                      transform: `rotate(${i * 45}deg)`,
                      background: `linear-gradient(180deg, ${dynamicColor} 0%, rgba(0,229,255,0.4) 100%)`,
                      opacity: 0.9,
                      boxShadow: `0 0 10px ${dynamicColor}40`,
                    }}
                  />
                ))}
                {/* Central neural hub */}
                <div className="absolute w-12 h-12 rounded-full bg-white/10 border-2 border-dashed border-white/30 animate-pulse" />
              </div>
            </>
          )}

          {/* 3. Crystal Array Matrix (Multi-dimensional crystal lattice) */}
          {activeSpinner.id === 'crystal-array' && (
            <>
              {/* Crystal resonance fields */}
              <div className="absolute inset-0 pointer-events-none z-10">
                <svg className="w-full h-full" viewBox="0 0 216 216">
                  {/* Outer crystal field */}
                  <circle
                    cx="108"
                    cy="108"
                    r="86"
                    fill="none"
                    stroke={dynamicColor}
                    strokeWidth="2"
                    strokeDasharray="35 100"
                    opacity="0.45"
                    style={{
                      transformOrigin: 'center',
                      animation: `spin ${Math.max(0.15, 2.0 - coolerMultiplier * 0.12)}s linear infinite`,
                    }}
                  />
                  {/* Inner crystal lattice */}
                  <circle
                    cx="108"
                    cy="108"
                    r="62"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                    strokeDasharray="18 60"
                    opacity="0.6"
                    style={{
                      transformOrigin: 'center',
                      animation: `spin-reverse ${Math.max(0.1, 1.4 - coolerMultiplier * 0.09)}s linear infinite`,
                    }}
                  />
                </svg>
              </div>

              {/* Crystal shard array */}
              <div
                className="absolute inset-4 rounded-full flex items-center justify-center pointer-events-none"
                style={{
                  transform: `rotate(${fanRotation}deg)`,
                }}
              >
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-[20px] h-[80px] origin-bottom"
                    style={{
                      bottom: '50%',
                      transform: `rotate(${i * 72}deg)`,
                      background: `linear-gradient(180deg, ${dynamicColor} 0%, rgba(63,81,181,0.5) 100%)`,
                      opacity: 0.8,
                      clipPath: 'polygon(50% 0%, 100% 20%, 80% 100%, 20% 100%, 0% 20%)',
                      boxShadow: `0 0 12px ${dynamicColor}50`,
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {/* 4. Plasma Fusion Reactor (Controlled nuclear fusion) */}
          {activeSpinner.id === 'plasma-fusion' && (
            <>
              {/* Fusion containment field */}
              <div className="absolute inset-0 pointer-events-none z-10">
                <svg className="w-full h-full" viewBox="0 0 216 216">
                  {/* Outer magnetic containment */}
                  <circle
                    cx="108"
                    cy="108"
                    r="90"
                    fill="none"
                    stroke={dynamicColor}
                    strokeWidth="4"
                    strokeDasharray="50 130"
                    opacity="0.7"
                    style={{
                      transformOrigin: 'center',
                      filter: `drop-shadow(0 0 15px ${dynamicColor})`,
                      animation: `spin ${Math.max(0.08, 1.0 - coolerMultiplier * 0.06)}s linear infinite`,
                    }}
                  />
                  {/* Inner plasma stream */}
                  <circle
                    cx="108"
                    cy="108"
                    r="70"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeDasharray="25 90"
                    opacity="0.8"
                    style={{
                      transformOrigin: 'center',
                      filter: `drop-shadow(0 0 8px #ffffff)`,
                      animation: `spin-reverse ${Math.max(0.06, 0.7 - coolerMultiplier * 0.05)}s linear infinite`,
                    }}
                  />
                  {/* Core fusion reaction */}
                  <circle
                    cx="108"
                    cy="108"
                    r="50"
                    fill="none"
                    stroke={dynamicColor}
                    strokeWidth="1.5"
                    strokeDasharray="15 60"
                    opacity="0.5"
                    style={{
                      transformOrigin: 'center',
                      animation: `spin ${Math.max(0.04, 0.5 - coolerMultiplier * 0.04)}s linear infinite`,
                    }}
                  />
                </svg>
              </div>

              {/* Fusion plasma core */}
              <div
                className="absolute inset-8 rounded-full flex items-center justify-center pointer-events-none"
                style={{
                  transform: `rotate(${fanRotation}deg)`,
                }}
              >
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-[12px] h-[68px] origin-bottom rounded-full"
                    style={{
                      bottom: '50%',
                      transform: `rotate(${i * 36}deg)`,
                      background: `linear-gradient(180deg, ${dynamicColor} 0%, rgba(118,255,3,0.6) 100%)`,
                      opacity: 0.95,
                      boxShadow: `0 0 15px ${dynamicColor}60`,
                    }}
                  />
                ))}
                {/* Central fusion core */}
                <div className="absolute w-16 h-16 rounded-full bg-white/20 border-2 border-dashed border-white/40 animate-pulse" 
                     style={{
                       boxShadow: `0 0 30px ${dynamicColor}80, inset 0 0 20px ${dynamicColor}40`,
                     }} 
                />
              </div>
            </>
          )}

          {/* Center Metal Hub Casing */}
          <div
            className="absolute inset-16 rounded-full bg-[#161822] border-2 shadow-[0_4px_15px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.08)] flex flex-col items-center justify-center transition-all duration-300 z-10"
            style={{ borderColor: dynamicColor }}
          >
            <span className="text-[10px] font-black text-white/95 leading-none font-mono tracking-tight">
              {(Number(temperature) || 30).toFixed(1)}°
            </span>
            <span className="text-[8px] font-extrabold text-text-tertiary uppercase tracking-wider leading-none mt-0.5 flex items-center gap-0.5">
              <Thermometer size={8} style={{ color: dynamicColor }} /> Temp
            </span>
          </div>

          {/* Free Trial Expired Overlay */}
          {!hasPurchasedMachine && isTrialExpired() && (
            <div className="absolute inset-0 rounded-full bg-black/90 backdrop-blur-[5px] flex flex-col items-center justify-center z-30 text-center p-4 border border-rose-500/40 animate-fade-in">
              <div className="w-9 h-9 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-2 animate-bounce">
                <Lock size={16} />
              </div>
              <span className="text-[11px] font-black text-rose-400 tracking-wider uppercase font-sans">Free Trial Expired</span>
              <span className="text-[8px] text-text-secondary mt-1 max-w-[130px] leading-tight font-sans font-medium">
                Your 24-hour trial node has ended. Acquire a Cloud Machine to resume daily yields.
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  impactOccurred('medium');
                  setActiveTab('boost');
                }}
                className="mt-2.5 press-feedback font-extrabold text-[9px] px-3.5 py-1.5 rounded-xl bg-usdt-green text-app-bg uppercase tracking-wider shadow-lg hover:brightness-110 flex items-center gap-1"
              >
                <span>Acquire Machine</span>
                <ChevronRight size={12} />
              </button>
            </div>
          )}

          {/* Lock Screen Overlay */}
          {baseSpeedGhs < activeSpinner.minBoostGhs && (
            <div className="absolute inset-0 rounded-full bg-black/85 backdrop-blur-[3px] flex flex-col items-center justify-center z-20 text-center p-4 border border-white/10 animate-fade-in">
              <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gold mb-2 animate-pulse">
                <Lock size={15} />
              </div>
              <span className="text-[10px] font-black text-white tracking-widest uppercase font-sans">Locked Machine</span>
              <span className="text-[8px] font-extrabold text-gold mt-1 font-mono">
                Requires: {((Number(activeSpinner?.minBoostGhs) || 0) * 10).toFixed(0)} CU
              </span>
              <span className="text-[8px] text-text-tertiary mt-1 max-w-[125px] leading-tight font-sans font-medium">
                Unlock a larger Machine in the Cloud Machines tab to access.
              </span>
            </div>
          )}

          {/* Threshold Limit Exceeded Overlay */}
          {isAnyLimitReached && (
            <div className="absolute inset-0 rounded-full bg-black/90 backdrop-blur-[4px] flex flex-col items-center justify-center z-25 text-center p-3 border border-error-red/30 animate-fade-in">
              <div className="w-9 h-9 rounded-full bg-error-red/10 border border-error-red/30 flex items-center justify-center text-error-red mb-1.5 animate-bounce">
                <Flame size={18} />
              </div>
              <span className="text-[10px] font-black text-error-red tracking-widest uppercase font-sans">Capacity Limit!</span>
              <span className="text-[9px] font-bold text-white mt-1 font-sans">
                {isDailyLimitReached && `Daily Limit Reached (${tapsToday}/${dailyTapLimit})`}
                {!isDailyLimitReached && isWeeklyLimitReached && `Weekly Limit Reached (${tapsThisWeek}/${weeklyTapLimit})`}
                {!isDailyLimitReached && !isWeeklyLimitReached && isMonthlyLimitReached && `Monthly Limit Reached (${tapsThisMonth}/${monthlyTapLimit})`}
              </span>
              <span className="text-[8px] text-text-tertiary mt-0.5 max-w-[125px] leading-tight font-sans font-medium">
                Compute capacity threshold reached. Upgrade limits to resume.
              </span>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  impactOccurred('heavy');
                  upgradeLimits();
                  showToast("Cooler threshold limits upgraded! Capacity expanded. ⚡", "success");
                }}
                className="mt-2.5 press-feedback font-extrabold text-[9px] px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-gold to-gold-bright text-app-bg uppercase tracking-wider shadow-md hover:brightness-110"
              >
                Upgrade Limit ⚡
              </button>
            </div>
          )}
        </motion.div>

        {/* Right selector arrow */}
        <button
          onClick={nextSpinner}
          className="press-feedback w-9 h-9 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-all z-20 shadow-md"
        >
          <ChevronRight size={18} />
        </button>
      </div>



    </div>
  );
};
