import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';

export interface QuantumLoopReactorRef {
  triggerTap: () => void;
}

interface QuantumLoopReactorProps {
  coolerMultiplier?: number;
  isOverheated?: boolean;
  isLocked?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDiscoveryEvent?: (title: string) => void;
  tierCode?: string;
  tierIndex?: number;
}

interface Particle {
  angle: number;
  dist: number;
  speed: number;
  size: number;
  opacity: number;
  isSpark?: boolean;
}

interface InwardBeam {
  angle: number;
  dist: number;
  maxDist: number;
  speed: number;
  alpha: number;
}

interface TapRipple {
  r: number;
  maxR: number;
  alpha: number;
  speed: number;
  color?: string;
}

interface Shockwave {
  r: number;
  maxR: number;
  alpha: number;
  color?: string;
  isStabilization?: boolean;
}

// Operating modes for Reactor Personality
const PERSONALITY_MODES = [
  { name: 'Stable', hueOffset: 0, speedFactor: 0.9, pulseSpeed: 0.8 },
  { name: 'Experimental', hueOffset: 35, speedFactor: 1.25, pulseSpeed: 1.3 },
  { name: 'Adaptive', hueOffset: -15, speedFactor: 1.1, pulseSpeed: 1.1 },
  { name: 'Quantum', hueOffset: 50, speedFactor: 1.4, pulseSpeed: 1.4 },
  { name: 'Precision', hueOffset: 10, speedFactor: 1.0, pulseSpeed: 0.9 },
  { name: 'Hyper Efficient', hueOffset: -30, speedFactor: 0.95, pulseSpeed: 0.85 },
  { name: 'Learning', hueOffset: 20, speedFactor: 1.15, pulseSpeed: 1.2 },
  { name: 'Autonomous', hueOffset: 40, speedFactor: 1.3, pulseSpeed: 1.35 },
];

function getDailyPersonality() {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const index = dayOfYear % PERSONALITY_MODES.length;
  return PERSONALITY_MODES[index];
}

// Resolve machine tier index (0 to 5)
function resolveTierIndex(tierCode?: string, tierIndex?: number): number {
  if (typeof tierIndex === 'number' && tierIndex >= 0) return Math.min(5, tierIndex);
  if (!tierCode) return 0;
  switch (tierCode) {
    case 'TS_C10': return 1;
    case 'TS_A50': return 2;
    case 'TS_P250': return 3;
    case 'TS_X1000': return 4;
    case 'TS_Q2500': return 5;
    default: return 0;
  }
}

// Color palette config per machine tier generation
function getTierColors(tierIdx: number, timeSec: number, hueOffset: number = 0) {
  // Base HSL calculation with tier-specific base hues
  const tierBaseHues = [195, 165, 275, 145, 290, 42]; // Cyan, Emerald, Violet/Orange, Bright Teal, Neon Purple, Gold
  const baseHue = tierBaseHues[tierIdx % tierBaseHues.length];
  const dynamicHue = (baseHue + Math.sin(timeSec * 0.5) * 15 + hueOffset + 360) % 360;

  switch (tierIdx) {
    case 1: // Gen 1: Ripple X14 — Engineered Turbine Shell (Teal/Emerald)
      return {
        primaryHex: `hsl(168, 100%, 50%)`,
        secondaryHex: `hsl(190, 100%, 60%)`,
        accentHex: `hsl(145, 100%, 70%)`,
        coreGlowRgb: '38, 161, 123',
        shellHex: '#1e2d3b',
        finHex: '#00e676',
        hue: 168,
      };
    case 2: // Gen 2: Surge R28 — Particle Accelerator Channels (Orange/Violet)
      return {
        primaryHex: `hsl(280, 100%, 65%)`,
        secondaryHex: `hsl(28, 100%, 55%)`,
        accentHex: `hsl(310, 100%, 75%)`,
        coreGlowRgb: '224, 64, 251',
        shellHex: '#2a1a3a',
        finHex: '#ff9100',
        hue: 280,
      };
    case 3: // Gen 3: Torrent V63 — Magnetic Containment Engine (Plasma Emerald/Steel)
      return {
        primaryHex: `hsl(152, 100%, 50%)`,
        secondaryHex: `hsl(180, 100%, 65%)`,
        accentHex: `hsl(120, 100%, 80%)`,
        coreGlowRgb: '16, 185, 129',
        shellHex: '#172e25',
        finHex: '#00e676',
        hue: 152,
      };
    case 4: // Gen 4: Cascade M91 — Autonomous AI Injector Modules (Hyper Purple/Magenta)
      return {
        primaryHex: `hsl(295, 100%, 60%)`,
        secondaryHex: `hsl(195, 100%, 60%)`,
        accentHex: `hsl(330, 100%, 75%)`,
        coreGlowRgb: '192, 38, 211',
        shellHex: '#2c123d',
        finHex: '#e040fb',
        hue: 295,
      };
    case 5: // Gen 5: StreamTitan 2028 — Fully Synchronized Titan Reactor (Gold/Titan Multi-Spectrum)
      return {
        primaryHex: `hsl(43, 100%, 55%)`,
        secondaryHex: `hsl(195, 100%, 60%)`,
        accentHex: `hsl(150, 100%, 70%)`,
        coreGlowRgb: '245, 158, 11',
        shellHex: '#3d2c10',
        finHex: '#fbbf24',
        hue: 43,
      };
    default: // Gen 0: Free Trial Titan Core — Baseline Quantum Loop Prototype (Electric Blue/Cyan)
      return {
        primaryHex: `hsl(${dynamicHue}, 100%, 55%)`,
        secondaryHex: `hsl(${(dynamicHue + 30) % 360}, 100%, 65%)`,
        accentHex: `hsl(${(dynamicHue - 25 + 360) % 360}, 100%, 75%)`,
        coreGlowRgb: '0, 176, 255',
        shellHex: '#122238',
        finHex: '#00e5ff',
        hue: dynamicHue,
      };
  }
}

// Web Audio API Synth Generator with Tier-Specific Tap Soundscapes
class ReactorAudioSynth {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  public playTapSound(tierIdx: number = 0) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Tier-specific pitch & sweep character
      const baseFreqs = [280, 340, 420, 220, 510, 360];
      const targetFreqs = [560, 680, 840, 440, 980, 1120];

      const startFreq = baseFreqs[tierIdx % baseFreqs.length];
      const endFreq = targetFreqs[tierIdx % targetFreqs.length];

      osc.type = tierIdx === 1 ? 'triangle' : tierIdx === 3 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + (tierIdx === 5 ? 0.25 : 0.12));

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (tierIdx === 5 ? 0.28 : 0.15));

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + (tierIdx === 5 ? 0.3 : 0.16));
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public playDiscoveryChime() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.42);
    } catch {
      // Audio autoplay policy fallback
    }
  }
}

const audioSynth = new ReactorAudioSynth();

export const QuantumLoopReactor = forwardRef<QuantumLoopReactorRef, QuantumLoopReactorProps>(
  ({ coolerMultiplier = 1.0, isOverheated = false, isLocked = false, onClick, onDiscoveryEvent, tierCode, tierIndex }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [personality] = useState(getDailyPersonality);
    const activeTierIdx = resolveTierIndex(tierCode, tierIndex);

    // Physics & state variables inside ref to avoid React re-renders during 60 FPS animation
    const stateRef = useRef({
      innerAngle: 0,
      middleAngle: 0,
      outerAngle: 0,
      shellAngle: 0,
      shellVentOpen: 0, // 0 = closed, 1 = wide open
      acceleratorPacketAngles: [0, Math.PI * 0.66, Math.PI * 1.33, Math.PI * 0.33, Math.PI, Math.PI * 1.66],
      containmentCompress: 0, // 0 = normal, 1 = compressed inward
      droneAngles: [0, (Math.PI * 2) / 5, ((Math.PI * 2) / 5) * 2, ((Math.PI * 2) / 5) * 3, ((Math.PI * 2) / 5) * 4],
      sequencePhase: 0, // Gen 5 chain pulse step
      sequenceTimer: 0,
      lastTime: performance.now(),
      lastTapTime: performance.now(),
      idleFactor: 0,
      tapSpeedSurge: 0,
      coreFlash: 0,
      pulseTimer: 0,
      nextPulseInterval: 5.5,
      autoEventTimer: 0,
      nextAutoEventInterval: 22.0,
      stabilizationTimer: 0,
      isStabilizing: false,
      stabilizePhase: 0,
      discoveryTimer: 0,
      ripples: [] as TapRipple[],
      shockwaves: [] as Shockwave[],
      inwardBeams: [] as InwardBeam[],
      particles: [] as Particle[],
      particleDir: 1,
    });

    // Imperative tap trigger handler exposing distinct tap interactions per tier
    useImperativeHandle(ref, () => ({
      triggerTap: () => {
        const s = stateRef.current;
        const now = performance.now();
        s.lastTapTime = now;
        s.idleFactor = 0; // Immediate energetic awakening
        s.tapSpeedSurge = Math.min(4.0, s.tapSpeedSurge + 1.4);
        s.coreFlash = 1.0;

        audioSynth.playTapSound(activeTierIdx);

        // --- TIER-SPECIFIC TAP INTERACTIONS ---

        // 1. Common Baseline Energy Ripple
        s.ripples.push({
          r: 24,
          maxR: 108,
          alpha: 0.95,
          speed: 5.2,
        });

        // 2. Gen 1+ (Ripple X14): Turbine Shell Vent Surge
        if (activeTierIdx >= 1) {
          s.shellVentOpen = 1.0; // Vents open wide to channel intake airflow
        }

        // 3. Gen 2+ (Surge R28): Particle Accelerator Hyper-Speed Pulse
        if (activeTierIdx >= 2) {
          // Push energy packets forward along tracks
          s.acceleratorPacketAngles = s.acceleratorPacketAngles.map((a) => a + Math.PI * 0.5);
        }

        // 4. Gen 3+ (Torrent V63): Magnetic Containment Compression Pulse
        if (activeTierIdx >= 3) {
          s.containmentCompress = 1.0; // Stabilizer arms tighten inward
          s.shockwaves.push({
            r: 22,
            maxR: 104,
            alpha: 1.0,
            color: activeTierIdx === 5 ? '#fbbf24' : '#00e676',
          });
        }

        // 5. Gen 4+ (Cascade M91): Autonomous AI Drone Laser Injection
        if (activeTierIdx >= 4) {
          s.droneAngles.forEach((angle) => {
            s.inwardBeams.push({
              angle,
              dist: 104,
              maxDist: 104,
              speed: 280,
              alpha: 1.0,
            });
          });
        }

        // 6. Gen 5 (StreamTitan 2028): Full Subsystem Sequential Chain Pulse
        if (activeTierIdx === 5) {
          s.sequencePhase = 1; // Begin multi-stage sequential chain pulse
          s.sequenceTimer = 0;
        } else {
          // Standard inward energy beam burst for tiers 0-4
          for (let b = 0; b < 5; b++) {
            const angle = Math.random() * Math.PI * 2;
            s.inwardBeams.push({
              angle,
              dist: 100,
              maxDist: 100,
              speed: 190 + Math.random() * 70,
              alpha: 0.9,
            });
          }
        }

        // Pull floating quantum particles inward
        s.particles.forEach((p) => {
          p.dist = Math.max(28, p.dist - 20);
          p.opacity = 1.0;
        });
      },
    }));

    // Initialize floating particle instances
    useEffect(() => {
      const particleCount = typeof window !== 'undefined' && (window.devicePixelRatio || 1) > 1.5 ? 24 : 16;
      const initialParticles: Particle[] = [];

      for (let i = 0; i < particleCount; i++) {
        initialParticles.push({
          angle: Math.random() * Math.PI * 2,
          dist: 38 + Math.random() * 62,
          speed: (0.25 + Math.random() * 0.5) * (Math.random() > 0.5 ? 1 : -1),
          size: 1.5 + Math.random() * 2.2,
          opacity: 0.3 + Math.random() * 0.6,
          isSpark: Math.random() > 0.65,
        });
      }

      stateRef.current.particles = initialParticles;
    }, []);

    // 60 FPS Canvas Animation Render Loop
    useEffect(() => {
      let animFrameId: number;

      const render = (now: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
        const width = 216;
        const height = 216;

        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
          canvas.width = width * dpr;
          canvas.height = height * dpr;
        }

        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);

        const cx = width / 2;
        const cy = height / 2;
        const timeSec = now / 1000;
        const dt = Math.min(0.05, (now - stateRef.current.lastTime) / 1000);
        stateRef.current.lastTime = now;

        const s = stateRef.current;

        // --- IDLE AWARENESS DRIFT ---
        const timeSinceTap = (now - s.lastTapTime) / 1000;
        if (timeSinceTap > 4.5) {
          s.idleFactor = Math.min(1.0, s.idleFactor + dt * 0.5);
        } else {
          s.idleFactor = Math.max(0.0, s.idleFactor - dt * 2.0);
        }

        const idleSpeedMult = 1.0 - s.idleFactor * 0.4;
        const idlePulseMult = 1.0 - s.idleFactor * 0.5;

        // Overheat & Lock factors
        const isActive = !isOverheated && !isLocked;
        const intensity = isActive ? (0.4 + 0.6 * Math.min(1.5, coolerMultiplier)) * personality.speedFactor * idleSpeedMult : 0;

        // Physics decay helpers
        s.tapSpeedSurge = Math.max(0, s.tapSpeedSurge - dt * 2.6);
        s.coreFlash = Math.max(0, s.coreFlash - dt * 3.2);
        s.shellVentOpen = Math.max(0, s.shellVentOpen - dt * 1.8);
        s.containmentCompress = Math.max(0, s.containmentCompress - dt * 2.2);

        // --- GEN 5 SEQUENTIAL CHAIN PULSE AUTOMATION ---
        if (s.sequencePhase > 0) {
          s.sequenceTimer += dt;
          if (s.sequencePhase === 1 && s.sequenceTimer >= 0.08) {
            s.sequencePhase = 2; // Phase 2: Accelerator energy packets race
            s.acceleratorPacketAngles = s.acceleratorPacketAngles.map((a) => a + Math.PI * 0.75);
          } else if (s.sequencePhase === 2 && s.sequenceTimer >= 0.16) {
            s.sequencePhase = 3; // Phase 3: Containment clamps compress
            s.containmentCompress = 1.0;
          } else if (s.sequencePhase === 3 && s.sequenceTimer >= 0.24) {
            s.sequencePhase = 4; // Phase 4: Autonomous AI drones lock & fire
            s.droneAngles.forEach((angle) => {
              s.inwardBeams.push({ angle, dist: 104, maxDist: 104, speed: 320, alpha: 1.0 });
            });
          } else if (s.sequencePhase === 4 && s.sequenceTimer >= 0.32) {
            s.sequencePhase = 0; // Final shockwave pulse release
            s.coreFlash = 1.0;
            s.shockwaves.push({ r: 24, maxR: 112, alpha: 1.0, color: '#fbbf24' });
          }
        }

        // --- INTELLIGENT AUTONOMOUS REACTOR EVENTS ---
        s.autoEventTimer += dt;
        if (s.autoEventTimer >= s.nextAutoEventInterval) {
          s.autoEventTimer = 0;
          s.nextAutoEventInterval = 20.0 + Math.random() * 20.0;
          if (isActive) {
            const eventType = Math.floor(Math.random() * 4);
            if (eventType === 0) s.particleDir *= -1;
            else if (eventType === 1) s.shockwaves.push({ r: 24, maxR: 104, alpha: 0.85 });
            else if (eventType === 2) s.coreFlash = 0.8;
            else s.tapSpeedSurge = 1.5;
          }
        }

        // --- REACTOR STABILIZATION CYCLE ---
        s.stabilizationTimer += dt;
        if (s.stabilizationTimer >= 140.0) {
          s.stabilizationTimer = 0;
          s.isStabilizing = true;
          s.stabilizePhase = 0;
          if (isActive) {
            s.shockwaves.push({ r: 20, maxR: 108, alpha: 1.0, isStabilization: true });
            s.coreFlash = 1.0;
          }
        }
        if (s.isStabilizing) {
          s.stabilizePhase += dt * 0.8;
          if (s.stabilizePhase >= 1.0) s.isStabilizing = false;
        }

        // --- RARE DISCOVERY TOAST EVENTS ---
        s.discoveryTimer += dt;
        if (s.discoveryTimer >= 75.0) {
          s.discoveryTimer = 0;
          if (isActive && Math.random() > 0.3 && onDiscoveryEvent) {
            const DISCOVERIES = [
              'Quantum Loop Calibrated',
              'Turbine Stream Optimized',
              'Particle Alignment Complete',
              'Containment Field Synced',
              'Autonomous AI Linked',
            ];
            const item = DISCOVERIES[Math.floor(Math.random() * DISCOVERIES.length)];
            audioSynth.playDiscoveryChime();
            onDiscoveryEvent(item);
          }
        }

        // --- QUANTUM PULSE LOGIC ---
        s.pulseTimer += dt;
        if (s.pulseTimer >= s.nextPulseInterval) {
          s.pulseTimer = 0;
          s.nextPulseInterval = 5.0 + Math.random() * 3.0;
          if (isActive) {
            s.shockwaves.push({ r: 28, maxR: 104, alpha: 0.8 });
            s.coreFlash = Math.max(s.coreFlash, 0.7);
          }
        }

        // Procedural rotational speed calculations
        const drift = Math.sin(timeSec * 0.8) * 0.05 + Math.cos(timeSec * 1.4) * 0.03;
        const speedBoost = (1 + s.tapSpeedSurge) * (1 + drift);

        const innerSpeed = 0.5 * intensity * speedBoost;
        const middleSpeed = -1.0 * intensity * speedBoost;
        const outerSpeed = 1.8 * intensity * speedBoost;
        const shellSpeed = 0.4 * intensity * speedBoost;

        s.innerAngle += innerSpeed * dt;
        s.middleAngle += middleSpeed * dt;
        s.outerAngle += outerSpeed * dt;
        s.shellAngle += shellSpeed * dt;

        // Energy packet speeds for particle accelerator (Gen 2+)
        s.acceleratorPacketAngles = s.acceleratorPacketAngles.map(
          (a, i) => a + (i % 2 === 0 ? 2.5 : -2.0) * intensity * speedBoost * dt
        );

        // Drone orbit speeds (Gen 4+)
        s.droneAngles = s.droneAngles.map((a) => a + 0.6 * intensity * speedBoost * dt);

        // Color palette resolution
        const colors = getTierColors(activeTierIdx, timeSec, personality.hueOffset);
        let primaryColor = colors.primaryHex;
        let secondaryColor = colors.secondaryHex;

        if (isOverheated) {
          primaryColor = '#ff1744';
          secondaryColor = '#ff5722';
        }

        // =========================================================================
        // LAYER 0: LIVING PLASMA CORE & INNER DISTORTION (FOUNDATION FOR ALL TIERS)
        // =========================================================================
        const pulseRatio = Math.sin(timeSec * 2.2 * personality.pulseSpeed * idlePulseMult) * 0.5 + 0.5;
        const coreRadius = (26 + pulseRatio * 4 + s.coreFlash * 7) * (1 - s.containmentCompress * 0.15);

        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 3.0);
        coreGrad.addColorStop(0, isOverheated ? 'rgba(255, 23, 68, 0.95)' : `rgba(255, 255, 255, ${0.92 + s.coreFlash * 0.08})`);
        coreGrad.addColorStop(0.22, isOverheated ? 'rgba(255, 23, 68, 0.75)' : `rgba(${colors.coreGlowRgb}, ${0.8 + pulseRatio * 0.15 + s.coreFlash * 0.2})`);
        coreGrad.addColorStop(0.65, isOverheated ? 'rgba(255, 87, 34, 0.3)' : `rgba(${colors.coreGlowRgb}, ${0.35 + pulseRatio * 0.15})`);
        coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, coreRadius * 3.0, 0, Math.PI * 2);
        ctx.fill();

        // Core inner distortion ring
        ctx.save();
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5 + pulseRatio * 0.3;
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(cx, cy, coreRadius * 0.88, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // =========================================================================
        // LAYER 1: INWARD ENERGY BEAMS, RIPPLES & SHOCKWAVES
        // =========================================================================
        for (let i = s.inwardBeams.length - 1; i >= 0; i--) {
          const bm = s.inwardBeams[i];
          bm.dist -= dt * bm.speed;
          bm.alpha -= dt * 0.9;

          if (bm.dist <= 15 || bm.alpha <= 0) {
            s.inwardBeams.splice(i, 1);
            continue;
          }

          const bx = cx + Math.cos(bm.angle) * bm.dist;
          const by = cy + Math.sin(bm.angle) * bm.dist;

          ctx.save();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = activeTierIdx === 5 ? 3.0 : 2.0;
          ctx.globalAlpha = Math.max(0, bm.alpha);
          ctx.shadowColor = primaryColor;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(cx, cy);
          ctx.stroke();
          ctx.restore();
        }

        // Shockwaves
        for (let i = s.shockwaves.length - 1; i >= 0; i--) {
          const sw = s.shockwaves[i];
          sw.r += dt * 80;
          sw.alpha -= dt * 0.8;

          if (sw.alpha <= 0 || sw.r >= sw.maxR) {
            s.shockwaves.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.strokeStyle = sw.color || (sw.isStabilization ? '#ffffff' : primaryColor);
          ctx.lineWidth = sw.isStabilization ? 4.0 : 3.0;
          ctx.globalAlpha = Math.max(0, sw.alpha);
          ctx.shadowColor = primaryColor;
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(cx, cy, sw.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Ripples
        for (let i = s.ripples.length - 1; i >= 0; i--) {
          const rp = s.ripples[i];
          rp.r += dt * rp.speed * 32;
          rp.alpha -= dt * 1.3;

          if (rp.alpha <= 0 || rp.r >= rp.maxR) {
            s.ripples.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.strokeStyle = rp.color || '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.globalAlpha = Math.max(0, rp.alpha);
          ctx.shadowColor = secondaryColor;
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.arc(cx, cy, rp.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // =========================================================================
        // LAYER 2: THREE INDEPENDENT FLOATING QUANTUM ENERGY RINGS (ALL TIERS)
        // =========================================================================
        const drawEnergyRing = (
          r: number,
          angle: number,
          segments: number,
          arcLengthRad: number,
          strokeWidth: number,
          color: string,
          baseOpacity: number,
          shadowBlur: number
        ) => {
          ctx.save();
          ctx.shadowColor = color;
          ctx.shadowBlur = shadowBlur;

          const pulseGlow = s.coreFlash * 0.35;
          const finalOpacity = Math.min(1.0, baseOpacity + pulseGlow);

          for (let i = 0; i < segments; i++) {
            const segStartAngle = angle + (i * (Math.PI * 2)) / segments;

            const trailSteps = 10;
            for (let t = 0; t < trailSteps; t++) {
              const stepFraction = t / trailSteps;
              const subArcStart = segStartAngle - arcLengthRad * stepFraction;
              const subArcEnd = subArcStart + (arcLengthRad / trailSteps) * 1.25;
              const trailAlpha = finalOpacity * Math.pow(1 - stepFraction, 1.6);

              ctx.strokeStyle = color;
              ctx.lineWidth = strokeWidth * (1 - stepFraction * 0.35);
              ctx.globalAlpha = Math.max(0, trailAlpha);
              ctx.beginPath();
              ctx.arc(cx, cy, r, subArcStart, subArcEnd);
              ctx.stroke();
            }

            const headAngle = segStartAngle + arcLengthRad * 0.05;
            const headX = cx + Math.cos(headAngle) * r;
            const headY = cy + Math.sin(headAngle) * r;

            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = Math.min(1.0, finalOpacity * 1.3);
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(headX, headY, strokeWidth * 0.95, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        };

        // Ring 1: INNER RING (r=48px)
        drawEnergyRing(48, s.innerAngle, 3, ((Math.PI * 2) / 3) * 0.65, 4.0, primaryColor, 0.9, 18);

        // Ring 2: MIDDLE RING (r=72px)
        drawEnergyRing(72, s.middleAngle, 4, ((Math.PI * 2) / 4) * 0.55, 2.8, secondaryColor, 0.8, 14);

        // Ring 3: OUTER RING (r=94px)
        drawEnergyRing(94, s.outerAngle, 6, ((Math.PI * 2) / 6) * 0.45, 1.8, colors.accentHex, 0.65, 10);

        // Thin magnetic field guideline
        ctx.save();
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 0.8;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(cx, cy, 94, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // =========================================================================
        // LAYER 3: GENERATION 1+ INNOVATION — ENGINEERED TURBINE SHELL (GEN 1, 2, 3, 4, 5)
        // =========================================================================
        if (activeTierIdx >= 1) {
          const numFins = 8;
          const shellR = 92;
          const finLen = 14 + s.shellVentOpen * 4;

          ctx.save();
          ctx.strokeStyle = colors.shellHex;
          ctx.lineWidth = 3.5;
          ctx.globalAlpha = 0.85;
          ctx.shadowColor = colors.finHex;
          ctx.shadowBlur = 8;

          for (let i = 0; i < numFins; i++) {
            const finAngle = s.shellAngle + (i * (Math.PI * 2)) / numFins;
            const innerX = cx + Math.cos(finAngle) * shellR;
            const innerY = cy + Math.sin(finAngle) * shellR;
            const outerX = cx + Math.cos(finAngle + 0.35 + s.shellVentOpen * 0.2) * (shellR + finLen);
            const outerY = cy + Math.sin(finAngle + 0.35 + s.shellVentOpen * 0.2) * (shellR + finLen);

            // Turbine fin blade
            ctx.strokeStyle = colors.finHex;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(innerX, innerY);
            ctx.lineTo(outerX, outerY);
            ctx.stroke();

            // Illuminated intake vent opening
            if (s.shellVentOpen > 0.1) {
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1.0;
              ctx.globalAlpha = s.shellVentOpen * 0.8;
              ctx.beginPath();
              ctx.arc(cx, cy, shellR + 4, finAngle, finAngle + 0.3);
              ctx.stroke();
            }
          }
          ctx.restore();
        }

        // =========================================================================
        // LAYER 4: GENERATION 2+ INNOVATION — PARTICLE ACCELERATOR CHANNELS (GEN 2, 3, 4, 5)
        // =========================================================================
        if (activeTierIdx >= 2) {
          const accR1 = 60;
          const accR2 = 78;

          ctx.save();
          // Track 1
          ctx.strokeStyle = colors.secondaryHex;
          ctx.lineWidth = 1.4;
          ctx.globalAlpha = 0.4;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.arc(cx, cy, accR1, 0, Math.PI * 2);
          ctx.stroke();

          // Track 2
          ctx.strokeStyle = colors.primaryHex;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(cx, cy, accR2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Circulating energy packets racing along tracks with light chasing
          s.acceleratorPacketAngles.forEach((pAngle, idx) => {
            const trackR = idx % 2 === 0 ? accR1 : accR2;
            const px = cx + Math.cos(pAngle) * trackR;
            const py = cy + Math.sin(pAngle) * trackR;

            // Packet trail
            ctx.strokeStyle = idx % 2 === 0 ? colors.secondaryHex : colors.primaryHex;
            ctx.lineWidth = 3.0;
            ctx.globalAlpha = 0.85;
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(cx, cy, trackR, pAngle - 0.4, pAngle);
            ctx.stroke();

            // Packet head photon
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px, py, 3.2, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
        }

        // =========================================================================
        // LAYER 5: GENERATION 3+ INNOVATION — MAGNETIC CONTAINMENT ENGINE (GEN 3, 4, 5)
        // =========================================================================
        if (activeTierIdx >= 3) {
          const numArms = 6;
          const armR = 98 - s.containmentCompress * 12; // Arms clamp inward on tap!

          ctx.save();
          for (let i = 0; i < numArms; i++) {
            const armAngle = (i * (Math.PI * 2)) / numArms + timeSec * 0.15;
            const ax = cx + Math.cos(armAngle) * armR;
            const ay = cy + Math.sin(armAngle) * armR;

            // Heavy magnetic stabilizer clamp arm
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = 2.0;
            ctx.shadowColor = primaryColor;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(ax, ay, 6.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Electromagnetic coil center
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ax, ay, 2.2, 0, Math.PI * 2);
            ctx.fill();

            // Electric plasma arc jump between adjacent arms
            const nextArmAngle = ((i + 1) * (Math.PI * 2)) / numArms + timeSec * 0.15;
            const nax = cx + Math.cos(nextArmAngle) * armR;
            const nay = cy + Math.sin(nextArmAngle) * armR;

            if (Math.sin(timeSec * 12 + i) > 0.2) {
              ctx.strokeStyle = colors.accentHex;
              ctx.lineWidth = 1.2;
              ctx.globalAlpha = 0.8;
              ctx.beginPath();
              ctx.moveTo(ax, ay);
              ctx.lineTo((ax + nax) / 2 + (Math.random() - 0.5) * 6, (ay + nay) / 2 + (Math.random() - 0.5) * 6);
              ctx.lineTo(nax, nay);
              ctx.stroke();
            }
          }
          ctx.restore();
        }

        // =========================================================================
        // LAYER 6: GENERATION 4+ INNOVATION — AUTONOMOUS AI INJECTOR MODULES (GEN 4, 5)
        // =========================================================================
        if (activeTierIdx >= 4) {
          ctx.save();
          s.droneAngles.forEach((dAngle, idx) => {
            const droneR = 104;
            const dx = cx + Math.cos(dAngle) * droneR;
            const dy = cy + Math.sin(dAngle) * droneR;

            // Drone mini-pod body
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = activeTierIdx === 5 ? '#fbbf24' : '#e040fb';
            ctx.lineWidth = 1.8;
            ctx.shadowColor = activeTierIdx === 5 ? '#fbbf24' : '#e040fb';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(dx, dy, 5.0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Scanning targeting beam aimed at core center
            ctx.strokeStyle = activeTierIdx === 5 ? 'rgba(251, 191, 36, 0.4)' : 'rgba(224, 64, 251, 0.4)';
            ctx.lineWidth = 0.8;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(dx, dy);
            ctx.lineTo(cx, cy);
            ctx.stroke();
            ctx.setLineDash([]);
          });
          ctx.restore();
        }

        // =========================================================================
        // LAYER 7: SUBTLE FLOATING PARTICLES & SPARKS (ALL TIERS)
        // =========================================================================
        s.particles.forEach((p) => {
          p.angle += p.speed * s.particleDir * (1 + s.tapSpeedSurge * 0.5) * idleSpeedMult * dt;

          const distWobble = p.dist + Math.sin(timeSec * 3 + p.angle * 2) * 3;
          const px = cx + Math.cos(p.angle) * distWobble;
          const py = cy + Math.sin(p.angle) * distWobble;

          ctx.save();
          ctx.fillStyle = p.isSpark ? '#ffffff' : primaryColor;
          ctx.globalAlpha = p.opacity * (0.65 + s.coreFlash * 0.35) * (1 - s.idleFactor * 0.3);
          if (p.isSpark) {
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 8;
          }
          ctx.beginPath();
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        ctx.restore();
        animFrameId = requestAnimationFrame(render);
      };

      animFrameId = requestAnimationFrame(render);
      return () => cancelAnimationFrame(animFrameId);
    }, [coolerMultiplier, isOverheated, isLocked, personality, onDiscoveryEvent, activeTierIdx]);

    return (
      <div
        onClick={onClick}
        className="relative w-[216px] h-[216px] flex items-center justify-center cursor-pointer select-none"
      >
        <canvas
          ref={canvasRef}
          style={{ width: 216, height: 216 }}
          className="absolute inset-0 pointer-events-none z-10"
        />
      </div>
    );
  }
);

QuantumLoopReactor.displayName = 'QuantumLoopReactor';
