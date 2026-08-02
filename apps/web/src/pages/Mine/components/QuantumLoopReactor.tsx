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
}

interface Shockwave {
  r: number;
  maxR: number;
  alpha: number;
  isStabilization?: boolean;
}

// Operating modes for Req 17 (Reactor Personality)
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

// Color interpolation helpers (HSL / RGB smooth transitions)
function getQuantumColor(timeSec: number, hueOffset: number = 0): {
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  coreGlowRgb: string;
  hue: number;
} {
  // Cycle smoothly between Electric Blue (~195), Cyan (~175), and Violet (~265) over ~18s
  const cycle = (timeSec % 18) / 18;
  let hue: number;
  if (cycle < 0.333) {
    const t = cycle / 0.333;
    hue = 195 + (175 - 195) * t;
  } else if (cycle < 0.666) {
    const t = (cycle - 0.333) / 0.333;
    hue = 175 + (265 - 175) * t;
  } else {
    const t = (cycle - 0.666) / 0.334;
    hue = 265 + (195 - 265) * t;
  }

  hue = (hue + hueOffset + 360) % 360;

  const primaryHex = `hsl(${hue}, 100%, 55%)`;
  const secondaryHex = `hsl(${(hue + 30) % 360}, 100%, 65%)`;
  const accentHex = `hsl(${(hue - 25 + 360) % 360}, 100%, 75%)`;
  
  // HSL to RGB conversion for canvas radial gradients
  const h = hue / 360;
  const s = 1.0;
  const l = 0.55;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const r = Math.round(hue2rgb(h + 1/3) * 255);
  const g = Math.round(hue2rgb(h) * 255);
  const b = Math.round(hue2rgb(h - 1/3) * 255);
  const coreGlowRgb = `${r}, ${g}, ${b}`;

  return { primaryHex, secondaryHex, accentHex, coreGlowRgb, hue };
}

// Web Audio API Synth Generator for Ambient Soundscape & Tap Feedback (Req 20)
class ReactorAudioSynth {
  private ctx: AudioContext | null = null;
  private humOsc: OscillatorNode | null = null;
  private humGain: GainNode | null = null;
  public isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  public playTapSound() {
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

      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(560, now + 0.12);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
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
  ({ coolerMultiplier = 1.0, isOverheated = false, isLocked = false, onClick, onDiscoveryEvent }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [personality] = useState(getDailyPersonality);

    // Refs for physics / animation state without React re-renders
    const stateRef = useRef({
      innerAngle: 0,
      middleAngle: 0,
      outerAngle: 0,
      lastTime: performance.now(),
      lastTapTime: performance.now(),
      idleFactor: 0, // 0 = energetic, 1 = calm idle (Req 13)
      tapSpeedSurge: 0,
      coreFlash: 0,
      pulseTimer: 0,
      nextPulseInterval: 5.5,
      autoEventTimer: 0,
      nextAutoEventInterval: 22.0, // Req 12
      stabilizationTimer: 0, // Req 15
      isStabilizing: false,
      stabilizePhase: 0,
      discoveryTimer: 0, // Req 18
      ripples: [] as TapRipple[],
      shockwaves: [] as Shockwave[],
      inwardBeams: [] as InwardBeam[],
      particles: [] as Particle[],
      particleDir: 1, // 1 or -1 for particle reversal events
    });

    // Expose imperative handle for tap events
    useImperativeHandle(ref, () => ({
      triggerTap: () => {
        const s = stateRef.current;
        const now = performance.now();
        s.lastTapTime = now;
        s.idleFactor = 0; // Immediate energetic awakening from idle (Req 13)
        
        // Chain speed surge (Req 14)
        s.tapSpeedSurge = Math.min(3.5, s.tapSpeedSurge + 1.2);
        s.coreFlash = 1.0;
        
        // Audio confirmation
        audioSynth.playTapSound();

        // Spawn outward expanding ripple
        s.ripples.push({
          r: 24,
          maxR: 106,
          alpha: 0.95,
          speed: 5.0,
        });

        // Spawn reactive inward energy beams (Req 14)
        for (let b = 0; b < 4; b++) {
          const angle = Math.random() * Math.PI * 2;
          s.inwardBeams.push({
            angle,
            dist: 100,
            maxDist: 100,
            speed: 180 + Math.random() * 60,
            alpha: 0.9,
          });
        }

        // Pull particles inward towards core
        s.particles.forEach((p) => {
          p.dist = Math.max(30, p.dist - 18);
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

    // Main 60 FPS Render Loop
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

        // --- REQ 13: IDLE AWARENESS SYSTEM ---
        const timeSinceTap = (now - s.lastTapTime) / 1000;
        if (timeSinceTap > 4.5) {
          // Smoothly drift to calm idle state
          s.idleFactor = Math.min(1.0, s.idleFactor + dt * 0.5);
        } else {
          s.idleFactor = Math.max(0.0, s.idleFactor - dt * 2.0);
        }

        const idleSpeedMult = 1.0 - s.idleFactor * 0.45; // 45% slower rotation in idle
        const idlePulseMult = 1.0 - s.idleFactor * 0.5;

        // Overheat / Lock multipliers
        const isActive = !isOverheated && !isLocked;
        const intensity = isActive ? (0.4 + 0.6 * Math.min(1.5, coolerMultiplier)) * personality.speedFactor * idleSpeedMult : 0;

        // Decay tap speed surge & core flash
        s.tapSpeedSurge = Math.max(0, s.tapSpeedSurge - dt * 2.8);
        s.coreFlash = Math.max(0, s.coreFlash - dt * 3.5);

        // --- REQ 12: INTELLIGENT AUTONOMOUS REACTOR EVENTS (20-40s) ---
        s.autoEventTimer += dt;
        if (s.autoEventTimer >= s.nextAutoEventInterval) {
          s.autoEventTimer = 0;
          s.nextAutoEventInterval = 20.0 + Math.random() * 20.0;
          if (isActive) {
            const eventType = Math.floor(Math.random() * 4);
            if (eventType === 0) {
              // Particle Direction Flip
              s.particleDir *= -1;
            } else if (eventType === 1) {
              // Scan Ring Flare
              s.shockwaves.push({ r: 24, maxR: 104, alpha: 0.85 });
            } else if (eventType === 2) {
              // Core Flare
              s.coreFlash = 0.8;
            } else {
              // Speed Impulse
              s.tapSpeedSurge = 1.5;
            }
          }
        }

        // --- REQ 15: REACTOR STABILIZATION CYCLE (Every 2.5 mins) ---
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
          if (s.stabilizePhase >= 1.0) {
            s.isStabilizing = false;
          }
        }

        // --- REQ 18: RARE DISCOVERY EVENTS (60-90s) ---
        s.discoveryTimer += dt;
        if (s.discoveryTimer >= 75.0) {
          s.discoveryTimer = 0;
          if (isActive && Math.random() > 0.3 && onDiscoveryEvent) {
            const DISCOVERIES = [
              'Quantum Resonance Detected',
              'Compute Optimization Found',
              'AI Cluster Expanded',
              'Tensor Alignment Complete',
              'Photon Synchronization Successful',
            ];
            const item = DISCOVERIES[Math.floor(Math.random() * DISCOVERIES.length)];
            audioSynth.playDiscoveryChime();
            onDiscoveryEvent(item);
          }
        }

        // --- REQ 5: QUANTUM PULSE LOGIC ---
        s.pulseTimer += dt;
        if (s.pulseTimer >= s.nextPulseInterval) {
          s.pulseTimer = 0;
          s.nextPulseInterval = 5.0 + Math.random() * 3.0;
          if (isActive) {
            s.shockwaves.push({ r: 28, maxR: 104, alpha: 0.8 });
            s.coreFlash = Math.max(s.coreFlash, 0.7);
          }
        }

        // Procedural speed drift: ±5% speed drift, micro accel/decel, magnetic easing
        const drift = Math.sin(timeSec * 0.8) * 0.05 + Math.cos(timeSec * 1.4) * 0.03;
        const speedBoost = (1 + s.tapSpeedSurge) * (1 + drift);

        // Ring angular speeds
        const innerSpeed = 0.5 * intensity * speedBoost;
        const middleSpeed = -1.0 * intensity * speedBoost; // Opposite direction
        const outerSpeed = 1.8 * intensity * speedBoost;

        s.innerAngle += innerSpeed * dt;
        s.middleAngle += middleSpeed * dt;
        s.outerAngle += outerSpeed * dt;

        // Colors
        const colors = getQuantumColor(timeSec, personality.hueOffset);
        let primaryColor = colors.primaryHex;
        let secondaryColor = colors.secondaryHex;

        if (isOverheated) {
          primaryColor = '#ff1744';
          secondaryColor = '#ff5722';
        }

        // --- LAYER 1: AMBIENT BACKDROP & LIVING PLASMA CORE GLOW ---
        const pulseRatio = Math.sin(timeSec * 2.2 * personality.pulseSpeed * idlePulseMult) * 0.5 + 0.5; // breathing pulse
        const coreRadius = 26 + pulseRatio * 4 + s.coreFlash * 7;

        // Radial core gradient (Living energy core with soft bloom & breathing glow)
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

        // --- REQ 14: INWARD ENERGY BEAMS (Tap energy injection) ---
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
          ctx.lineWidth = 2.0;
          ctx.globalAlpha = Math.max(0, bm.alpha);
          ctx.shadowColor = primaryColor;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(cx, cy);
          ctx.stroke();
          ctx.restore();
        }

        // --- LAYER 2: QUANTUM PULSE SHOCKWAVES & RIPPLES ---
        for (let i = s.shockwaves.length - 1; i >= 0; i--) {
          const sw = s.shockwaves[i];
          sw.r += dt * 80;
          sw.alpha -= dt * 0.8;

          if (sw.alpha <= 0 || sw.r >= sw.maxR) {
            s.shockwaves.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.strokeStyle = sw.isStabilization ? '#ffffff' : primaryColor;
          ctx.lineWidth = sw.isStabilization ? 4.0 : 3.0;
          ctx.globalAlpha = Math.max(0, sw.alpha);
          ctx.shadowColor = primaryColor;
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(cx, cy, sw.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Tap ripples
        for (let i = s.ripples.length - 1; i >= 0; i--) {
          const rp = s.ripples[i];
          rp.r += dt * rp.speed * 32;
          rp.alpha -= dt * 1.3;

          if (rp.alpha <= 0 || rp.r >= rp.maxR) {
            s.ripples.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.globalAlpha = Math.max(0, rp.alpha);
          ctx.shadowColor = secondaryColor;
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.arc(cx, cy, rp.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // --- LAYER 3: THREE INDEPENDENT ENERGY RINGS WITH TRAILS ---
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
              const subArcStart = segStartAngle - (arcLengthRad * stepFraction);
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
        drawEnergyRing(
          48,
          s.innerAngle,
          3,
          (Math.PI * 2) / 3 * 0.65,
          4.0,
          primaryColor,
          0.9,
          18
        );

        // Ring 2: MIDDLE RING (r=72px)
        drawEnergyRing(
          72,
          s.middleAngle,
          4,
          (Math.PI * 2) / 4 * 0.55,
          2.8,
          secondaryColor,
          0.8,
          14
        );

        // Ring 3: OUTER RING (r=94px)
        drawEnergyRing(
          94,
          s.outerAngle,
          6,
          (Math.PI * 2) / 6 * 0.45,
          1.8,
          colors.accentHex,
          0.65,
          10
        );

        // Thin magnetic containment field line
        ctx.save();
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 0.8;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(cx, cy, 94, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // --- LAYER 4: SUBTLE FLOATING PARTICLES & SPARKS ---
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
    }, [coolerMultiplier, isOverheated, isLocked, personality, onDiscoveryEvent]);

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
