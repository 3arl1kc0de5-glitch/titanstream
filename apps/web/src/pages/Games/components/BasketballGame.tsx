import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Flame } from 'lucide-react';
import { useWalletStore } from '../../../store/useWalletStore';
import { useQuestStore } from '../../../store/useQuestStore';

interface BasketballGameProps {
  onClose: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface FireParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

export const BasketballGame: React.FC<BasketballGameProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { updateBalance } = useWalletStore();
  const { incrementProgress, incrementCategoryProgress } = useQuestStore();

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [active, setActive] = useState(true);

  // Swipe gesture variables
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const dragCurrent = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);

  // Active fire particles
  const fireParticles = useRef<FireParticle[]>([]);

  // Score particle list
  const scoreParticles = useRef<Array<{ id: number; x: number; y: number; vx: number; vy: number; color: string; size: number }>>([]);

  // Rim ripple effect
  const rimRipple = useRef<{ active: boolean; radius: number; opacity: number } | null>(null);

  // Game physics variables (encapsulated in ref to avoid re-renders)
  const gameState = useRef({
    ball: { x: 180, y: 420, vx: 0, vy: 0, radius: 15, isLaunched: false, bounced: 0 },
    hoop: { x: 180, y: 120, vx: 1.8, width: 50, height: 6, direction: 1, baseSpeed: 1.8 },
    backboard: { x: 180, y: 100, width: 70, height: 40 },
    gravity: 0.28,
    friction: 0.98,
    scoredThisLaunch: false,
    flashes: 0,
    time: 0,
  });

  useEffect(() => {
    // Load highscore from localStorage
    const savedHighScore = localStorage.getItem('hoop_masters_high_score');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }
  }, []);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const triggerConfetti = (hx: number, hy: number) => {
      const colors = ['#00e676', '#ffb300', '#ff5252', '#00e5ff', '#ff007f'];
      const particlesList: Array<{ id: number; x: number; y: number; vx: number; vy: number; color: string; size: number }> = [];
      for (let i = 0; i < 20; i++) {
        particlesList.push({
          id: Date.now() + i + Math.random(),
          x: hx,
          y: hy,
          vx: (Math.random() - 0.5) * 6,
          vy: -Math.random() * 4 - 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 5 + 3,
        });
      }
      scoreParticles.current = [...scoreParticles.current, ...particlesList];
    };

    const updatePhysics = () => {
      const state = gameState.current;
      state.time += 0.02;

      // 1. Move hoop left and right
      const currentSpeed = state.hoop.baseSpeed + Math.min(score * 0.12, 2.5);
      state.hoop.x += currentSpeed * state.hoop.direction;

      // Vertical wave difficulty
      if (score >= 3) {
        state.hoop.y = 120 + Math.sin(state.time * 2) * 15;
      } else {
        state.hoop.y = 120;
      }
      state.backboard.y = state.hoop.y - 20;

      if (state.hoop.x - state.hoop.width / 2 < 15 || state.hoop.x + state.hoop.width / 2 > canvas.width - 15) {
        state.hoop.direction *= -1;
      }
      state.backboard.x = state.hoop.x;

      // Update confetti particles
      scoreParticles.current = scoreParticles.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.15,
          size: Math.max(0, p.size - 0.08),
        }))
        .filter((p) => p.size > 0);

      // Spawn and update fire particles
      if (combo >= 3 && state.ball.isLaunched) {
        const fireColors = ['#ff3d00', '#ff9100', '#ffea00'];
        for (let i = 0; i < 2; i++) {
          fireParticles.current.push({
            id: Math.random() + Date.now(),
            x: state.ball.x + (Math.random() - 0.5) * 15,
            y: state.ball.y + (Math.random() - 0.5) * 15,
            vx: (Math.random() - 0.5) * 1.5 - state.ball.vx * 0.2,
            vy: (Math.random() - 0.5) * 1.5 - state.ball.vy * 0.2,
            size: Math.random() * 8 + 6,
            opacity: 1.0,
            color: fireColors[Math.floor(Math.random() * fireColors.length)],
          });
        }
      }

      fireParticles.current = fireParticles.current
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy - 0.5, // float upwards slightly
          size: Math.max(0, p.size - 0.25),
          opacity: Math.max(0, p.opacity - 0.04),
        }))
        .filter((p) => p.size > 0 && p.opacity > 0);

      // Update Rim Ripple
      if (rimRipple.current && rimRipple.current.active) {
        rimRipple.current.radius += 1.5;
        rimRipple.current.opacity -= 0.04;
        if (rimRipple.current.opacity <= 0) {
          rimRipple.current.active = false;
        }
      }

      // 2. Ball physics if launched
      if (state.ball.isLaunched) {
        state.ball.vy += state.gravity;
        state.ball.x += state.ball.vx;
        state.ball.y += state.ball.vy;

        // Bounce off walls
        if (state.ball.x - state.ball.radius < 0) {
          state.ball.x = state.ball.radius;
          state.ball.vx *= -0.6;
        } else if (state.ball.x + state.ball.radius > canvas.width) {
          state.ball.x = canvas.width - state.ball.radius;
          state.ball.vx *= -0.6;
        }

        // Check backboard collision
        const bb = state.backboard;
        if (
          state.ball.x + state.ball.radius > bb.x - bb.width / 2 &&
          state.ball.x - state.ball.radius < bb.x + bb.width / 2 &&
          state.ball.y + state.ball.radius > bb.y - bb.height / 2 &&
          state.ball.y - state.ball.radius < bb.y + bb.height / 2
        ) {
          // Bounce off backboard
          state.ball.vx *= -0.65;
          state.ball.vy *= -0.55;
          state.ball.y = bb.y - bb.height / 2 - state.ball.radius;
        }

        // Check Hoop Collision (Goal!)
        const hoopY = state.hoop.y;
        const hoopLeft = state.hoop.x - state.hoop.width / 2;
        const hoopRight = state.hoop.x + state.hoop.width / 2;

        if (
          !state.scoredThisLaunch &&
          state.ball.vy > 0 &&
          state.ball.y >= hoopY &&
          state.ball.y - state.ball.vy <= hoopY + 12 &&
          state.ball.x >= hoopLeft &&
          state.ball.x <= hoopRight
        ) {
          state.scoredThisLaunch = true;
          state.flashes = 15;

          // Fire Rim Ripple
          rimRipple.current = { active: true, radius: 10, opacity: 1.0 };
          triggerConfetti(state.hoop.x, state.hoop.y);

          setScore((s) => {
            const nextScore = s + 1;
            setCombo((c) => {
              const nextCombo = c + 1;
              const crystalPayout = nextCombo >= 3 ? 2 : 1;

              updateBalance({ crystalsBalance: useWalletStore.getState().crystalsBalance + crystalPayout });

              if (nextScore > highScore) {
                setHighScore(nextScore);
                localStorage.setItem('hoop_masters_high_score', nextScore.toString());
              }

              incrementCategoryProgress('Games', 1);
              incrementProgress('q21', 1);

              return nextCombo;
            });
            return nextScore;
          });
        }

        // Reset ball if it falls off bottom
        if (state.ball.y - state.ball.radius > canvas.height) {
          state.ball.isLaunched = false;
          state.ball.x = canvas.width / 2;
          state.ball.y = 420;
          state.ball.vx = 0;
          state.ball.vy = 0;
          fireParticles.current = [];

          if (!state.scoredThisLaunch) {
            setCombo(0);
          }
          state.scoredThisLaunch = false;
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const state = gameState.current;

      // 1. Flash green screen if scored
      if (state.flashes > 0) {
        ctx.fillStyle = `rgba(0, 230, 118, ${state.flashes / 45})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        state.flashes--;
      }

      // Draw dynamic floor shadow (scales/fades based on height)
      const floorY = 440;
      const heightAboveFloor = Math.max(0, floorY - state.ball.y);
      const shadowScale = Math.max(0.15, 1 - heightAboveFloor / 280);
      const shadowOpacity = Math.max(0.04, 0.35 - heightAboveFloor / 500);

      ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
      ctx.beginPath();
      ctx.ellipse(state.ball.x, floorY + 15, state.ball.radius * 1.6 * shadowScale, state.ball.radius * 0.45 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw confetti particles
      scoreParticles.current.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // Draw fire particles (if combo active)
      fireParticles.current.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.shadowBlur = p.size * 1.5;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;

      // Draw Net Support
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(state.hoop.x, state.hoop.y - 15);
      ctx.lineTo(state.hoop.x, 0);
      ctx.stroke();

      // Draw Backboard
      const bb = state.backboard;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(bb.x - bb.width / 2, bb.y - bb.height / 2, bb.width, bb.height, 6);
      ctx.fill();
      ctx.stroke();

      // Inner square of backboard
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bb.x - 18, bb.y + bb.height / 2 - 25, 36, 22, 2);
      ctx.stroke();

      // Draw Net Mesh
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const hY = state.hoop.y;
      const hL = state.hoop.x - state.hoop.width / 2;
      const hR = state.hoop.x + state.hoop.width / 2;
      
      ctx.moveTo(hL, hY);
      ctx.lineTo(hL + 6, hY + 22);
      ctx.lineTo(hR - 6, hY + 22);
      ctx.lineTo(hR, hY);
      ctx.moveTo(hL + 12, hY);
      ctx.lineTo(hL + 15, hY + 22);
      ctx.moveTo(hR - 12, hY);
      ctx.lineTo(hR - 15, hY + 22);
      ctx.stroke();

      // Draw Hoop Rim
      ctx.strokeStyle = combo >= 3 ? '#ff3d00' : '#ff9100';
      ctx.shadowBlur = combo >= 3 ? 12 : 6;
      ctx.shadowColor = combo >= 3 ? '#ff3d00' : '#ff9100';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(hL, hY);
      ctx.lineTo(hR, hY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Rim ripple
      if (rimRipple.current && rimRipple.current.active) {
        ctx.strokeStyle = `rgba(0, 230, 118, ${rimRipple.current.opacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(state.hoop.x, state.hoop.y, rimRipple.current.radius, 0, Math.PI, false);
        ctx.stroke();
      }

      // Draw trajectory line
      if (isDragging.current && dragStart.current && dragCurrent.current) {
        const dx = dragStart.current.x - dragCurrent.current.x;
        const dy = dragStart.current.y - dragCurrent.current.y;

        ctx.strokeStyle = 'rgba(0, 230, 118, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(state.ball.x, state.ball.y);

        let simX = state.ball.x;
        let simY = state.ball.y;
        let simVx = dx * 0.125;
        let simVy = dy * 0.125;

        for (let i = 0; i < 20; i++) {
          simVy += state.gravity;
          simX += simVx;
          simY += simVy;
          ctx.lineTo(simX, simY);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Improved 3D Basketball with Radial Gradient and contour ribs
      const ballGrad = ctx.createRadialGradient(
        state.ball.x - state.ball.radius * 0.3,
        state.ball.y - state.ball.radius * 0.3,
        2,
        state.ball.x,
        state.ball.y,
        state.ball.radius
      );
      if (combo >= 3) {
        // Glowing Fireball colors
        ballGrad.addColorStop(0, '#ffeb3b');
        ballGrad.addColorStop(0.3, '#ff5722');
        ballGrad.addColorStop(1, '#bf360c');
      } else {
        // Classic basketball shading
        ballGrad.addColorStop(0, '#ffa726');
        ballGrad.addColorStop(0.4, '#e65100');
        ballGrad.addColorStop(1, '#8e2400');
      }

      ctx.fillStyle = ballGrad;
      ctx.strokeStyle = combo >= 3 ? '#ffe082' : '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rib seam lines contoured around sphere
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 1.2;
      
      // vertical curved rib
      ctx.beginPath();
      ctx.arc(state.ball.x - state.ball.radius * 0.5, state.ball.y, state.ball.radius * 0.86, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();

      // vertical curved rib 2
      ctx.beginPath();
      ctx.arc(state.ball.x + state.ball.radius * 0.5, state.ball.y, state.ball.radius * 0.86, Math.PI * 0.55, Math.PI * 1.45);
      ctx.stroke();

      // horizontal straight seam
      ctx.beginPath();
      ctx.moveTo(state.ball.x - state.ball.radius, state.ball.y);
      ctx.lineTo(state.ball.x + state.ball.radius, state.ball.y);
      ctx.stroke();
    };

    const renderLoop = () => {
      updatePhysics();
      draw();
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [active, score, highScore, combo]);

  const handleStart = (clientX: number, clientY: number) => {
    if (gameState.current.ball.isLaunched) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const ball = gameState.current.ball;
    const dist = Math.hypot(x - ball.x, y - ball.y);
    if (dist < 45) {
      dragStart.current = { x, y };
      dragCurrent.current = { x, y };
      isDragging.current = true;
    }
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging.current || !dragStart.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    dragCurrent.current = { x, y };
  };

  const handleEnd = () => {
    if (!isDragging.current || !dragStart.current || !dragCurrent.current) return;
    isDragging.current = false;

    const dx = dragStart.current.x - dragCurrent.current.x;
    const dy = dragStart.current.y - dragCurrent.current.y;

    if (Math.hypot(dx, dy) > 15) {
      const state = gameState.current;
      // Increased multiplier for better throw power
      state.ball.vx = dx * 0.14;
      state.ball.vy = dy * 0.14;
      state.ball.isLaunched = true;
    }

    dragStart.current = null;
    dragCurrent.current = null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050608]/95 backdrop-blur-xl flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[420px] relative flex flex-col items-center animate-fade-in">
        
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-4 px-4">
          <div>
            <h2 className="text-xl font-black text-white tracking-wide flex items-center gap-1.5">
              HOOP MASTERS
            </h2>
            <p className="text-xs text-text-tertiary">Swipe backward to charge and release</p>
          </div>
          <button
            onClick={() => {
              setActive(false);
              onClose();
            }}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-secondary active:scale-95 transition-transform"
          >
            <X size={20} />
          </button>
        </div>

        {/* Dashboard and Streak indicators */}
        <div className="w-[90%] grid grid-cols-3 gap-2.5 mb-4">
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl py-2 px-3 flex flex-col items-center">
            <span className="text-[9px] font-extrabold uppercase tracking-wide text-text-tertiary">Score</span>
            <span className="font-mono text-base text-usdt-green font-black mt-0.5">{score} 🏀</span>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl py-2 px-3 flex flex-col items-center relative overflow-hidden">
            {combo >= 3 && (
              <div className="absolute inset-0 bg-[#ff3d00]/5 animate-pulse" />
            )}
            <span className="text-[9px] font-extrabold uppercase tracking-wide text-text-tertiary flex items-center gap-0.5">
              Streak
              {combo >= 3 && <Flame size={10} className="text-[#ff3d00] animate-bounce" />}
            </span>
            <span className={`font-mono text-base font-black mt-0.5 ${combo >= 3 ? 'text-[#ff3d00] animate-pulse' : 'text-white'}`}>
              {combo}
            </span>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl py-2 px-3 flex flex-col items-center">
            <span className="text-[9px] font-extrabold uppercase tracking-wide text-text-tertiary">Best</span>
            <span className="font-mono text-base text-gold font-black mt-0.5">{highScore} 🏆</span>
          </div>
        </div>

        {/* Canvas Arena Container */}
        <div className="relative border border-white/10 rounded-3xl bg-gradient-to-b from-[#12141d] to-[#0e0f14] shadow-2xl overflow-hidden mb-5">
          <canvas
            ref={canvasRef}
            width={360}
            height={500}
            className="block"
            onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
            onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={handleEnd}
          />

          {/* Fire Mode Indicator overlay */}
          {combo >= 3 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#ff3d00]/15 border border-[#ff3d00]/40 text-[#ff3d00] text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider shadow-lg animate-pulse z-20">
              <Flame size={12} className="animate-bounce" /> FIRE MODE 2X PAYOUT!
            </div>
          )}
        </div>

        {/* Sub-label explaining combos */}
        <div className="flex flex-col gap-1 items-center justify-center text-center px-6">
          <div className="flex items-center gap-1.5 text-xs text-[#a7ffeb] font-bold">
            <Sparkles size={14} className="text-[#a7ffeb] animate-spin-slow" />
            <span>Score baskets to earn Crystals 💎</span>
          </div>
          <p className="text-[10px] text-text-tertiary">
            Get a streak of 3 or more to activate Fire Mode! Fire mode doubles your rewards per basket. Bouncing the ball resets the streak.
          </p>
        </div>
      </div>
    </div>
  );
};
