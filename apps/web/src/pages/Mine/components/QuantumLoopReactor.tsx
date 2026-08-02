import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export interface QuantumLoopReactorRef {
  triggerTap: () => void;
}

interface QuantumLoopReactorProps {
  coolerMultiplier?: number;
  isOverheated?: boolean;
  isLocked?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

interface Particle {
  angle: number;
  dist: number;
  speed: number;
  size: number;
  opacity: number;
  isSpark?: boolean;
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
}

// Color interpolation helpers (HSL / RGB smooth transitions)
function getQuantumColor(timeSec: number): {
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
    // 195 (Electric Blue) -> 175 (Cyan)
    const t = cycle / 0.333;
    hue = 195 + (175 - 195) * t;
  } else if (cycle < 0.666) {
    // 175 (Cyan) -> 265 (Violet)
    const t = (cycle - 0.333) / 0.333;
    hue = 175 + (265 - 175) * t;
  } else {
    // 265 (Violet) -> 195 (Electric Blue)
    const t = (cycle - 0.666) / 0.334;
    hue = 265 + (195 - 265) * t;
  }

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

export const QuantumLoopReactor = forwardRef<QuantumLoopReactorRef, QuantumLoopReactorProps>(
  ({ coolerMultiplier = 1.0, isOverheated = false, isLocked = false, onClick }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Refs for physics / animation state without React re-renders
    const stateRef = useRef({
      innerAngle: 0,
      middleAngle: 0,
      outerAngle: 0,
      lastTime: performance.now(),
      tapSpeedSurge: 0,
      coreFlash: 0,
      pulseTimer: 0,
      nextPulseInterval: 5.5, // random 5-8 seconds
      ripples: [] as TapRipple[],
      shockwaves: [] as Shockwave[],
      particles: [] as Particle[],
    });

    // Expose imperative handle for tap events
    useImperativeHandle(ref, () => ({
      triggerTap: () => {
        const s = stateRef.current;
        s.tapSpeedSurge = 2.5; // Temporary ring acceleration
        s.coreFlash = 1.0; // Soft core flash
        
        // Spawn outward expanding ripple
        s.ripples.push({
          r: 24,
          maxR: 106,
          alpha: 0.9,
          speed: 4.8,
        });

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

        // Overheat / Lock multipliers
        const isActive = !isOverheated && !isLocked;
        const intensity = isActive ? 0.4 + 0.6 * Math.min(1.5, coolerMultiplier) : 0;

        // Decay tap speed surge & core flash
        s.tapSpeedSurge = Math.max(0, s.tapSpeedSurge - dt * 3.5);
        s.coreFlash = Math.max(0, s.coreFlash - dt * 4.0);

        // Quantum pulse logic (Every 5-8 seconds)
        s.pulseTimer += dt;
        if (s.pulseTimer >= s.nextPulseInterval) {
          s.pulseTimer = 0;
          s.nextPulseInterval = 5.0 + Math.random() * 3.0; // random between 5 and 8 seconds
          if (isActive) {
            s.shockwaves.push({
              r: 28,
              maxR: 104,
              alpha: 0.8,
            });
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
        const colors = getQuantumColor(timeSec);
        let primaryColor = colors.primaryHex;
        let secondaryColor = colors.secondaryHex;

        if (isOverheated) {
          primaryColor = '#ff1744';
          secondaryColor = '#ff5722';
        }

        // --- LAYER 1: AMBIENT BACKDROP & LIVING PLASMA CORE GLOW ---
        const pulseRatio = Math.sin(timeSec * 2.2) * 0.5 + 0.5; // breathing pulse
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

        // --- LAYER 2: QUANTUM PULSE SHOCKWAVES & RIPPLES ---
        // Shockwaves (expanding energy wave emitting from reactor every 5-8s)
        for (let i = s.shockwaves.length - 1; i >= 0; i--) {
          const sw = s.shockwaves[i];
          sw.r += dt * 80;
          sw.alpha -= dt * 0.8;

          if (sw.alpha <= 0 || sw.r >= sw.maxR) {
            s.shockwaves.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = 3.0;
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

        // Helper to draw segmented energy ring with trailing opacity
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
            
            // Draw trail with multi-step sub-arcs fading backwards
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

            // High intensity leading head particle on the ring segment
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

        // Ring 1: INNER RING (Slow, brightest, closest to core, r=48px)
        drawEnergyRing(
          48,
          s.innerAngle,
          3, // 3 arc segments
          (Math.PI * 2) / 3 * 0.65, // length of each segment
          4.0,
          primaryColor,
          0.9,
          18
        );

        // Ring 2: MIDDLE RING (Medium speed, opposite direction, r=72px)
        drawEnergyRing(
          72,
          s.middleAngle,
          4, // 4 arc segments
          (Math.PI * 2) / 4 * 0.55,
          2.8,
          secondaryColor,
          0.8,
          14
        );

        // Ring 3: OUTER RING (Fastest, thin, subtle high-tech quantum boundary, r=94px)
        drawEnergyRing(
          94,
          s.outerAngle,
          6, // 6 fine segments
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
          // Orbit angle update
          p.angle += p.speed * (1 + s.tapSpeedSurge * 0.5) * dt;
          
          // Wobble distance
          const distWobble = p.dist + Math.sin(timeSec * 3 + p.angle * 2) * 3;
          const px = cx + Math.cos(p.angle) * distWobble;
          const py = cy + Math.sin(p.angle) * distWobble;

          ctx.save();
          ctx.fillStyle = p.isSpark ? '#ffffff' : primaryColor;
          ctx.globalAlpha = p.opacity * (0.65 + s.coreFlash * 0.35);
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
    }, [coolerMultiplier, isOverheated, isLocked]);

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
