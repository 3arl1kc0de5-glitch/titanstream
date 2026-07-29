import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useTelegram } from '../context/TelegramContext';
import { 
  Server, 
  TrendingUp, 
  Cpu, 
  ShieldCheck,
  CheckCircle2, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface OnboardingOverlayProps {
  onComplete?: () => void;
}

interface Slide {
  id: number;
  title: string;
  copy: string;
  icon: React.ReactNode;
  gradient: string;
  bgGlow: string;
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { markOnboardingComplete } = useAuthStore();
  const { hapticFeedback } = useTelegram();

  const slides: Slide[] = [
    {
      id: 0,
      title: "Welcome to TetherStream 👋",
      copy: "TetherStream gives everyday people access to powerful cloud computers.\n\nYou don't need to own expensive equipment — we make it simple to get started together.",
      icon: <Server size={28} />,
      gradient: "from-emerald-400 to-cyan-400",
      bgGlow: "bg-emerald-500/15",
    },
    {
      id: 1,
      title: "How does it make money?",
      copy: "Businesses around the world rent cloud computers every day.\n\nThey use them for AI, apps, websites, data processing, video rendering, and many other tasks.\n\nTetherStream grows cloud capacity and shares part of the revenue with its community.",
      icon: <TrendingUp size={28} />,
      gradient: "from-purple-400 to-indigo-400",
      bgGlow: "bg-purple-500/15",
    },
    {
      id: 2,
      title: "Why is this growing so fast?",
      copy: "AI is changing everything.\n\nEvery AI tool needs powerful cloud computers to work.\n\nAs more companies build AI products, the demand for cloud computing continues to grow.",
      icon: <Cpu size={28} />,
      gradient: "from-rose-400 to-pink-400",
      bgGlow: "bg-rose-500/15",
    },
    {
      id: 3,
      title: "Why should I trust it?",
      copy: "You can always see:\n\n• Your funding history\n• Your activity\n• Your rewards\n• Your transactions\n\nEverything is tracked inside your account, and your funds follow a controlled financial process.",
      icon: <ShieldCheck size={28} />,
      gradient: "from-amber-400 to-orange-400",
      bgGlow: "bg-amber-500/15",
    },
    {
      id: 4,
      title: "You're ready to begin.",
      copy: "Let's complete your setup so you can explore the platform.",
      icon: <CheckCircle2 size={28} />,
      gradient: "from-usdt-green to-emerald-400",
      bgGlow: "bg-usdt-green/15",
    }
  ];

  const handleNext = () => {
    hapticFeedback.impactOccurred('medium');
    if (currentStep < slides.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      markOnboardingComplete();
      if (onComplete) onComplete();
    }
  };

  const handleSkip = () => {
    hapticFeedback.impactOccurred('light');
    markOnboardingComplete();
    if (onComplete) onComplete();
  };

  const slide = slides[currentStep];
  const isLast = currentStep === slides.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-[#06070b] flex flex-col select-none overflow-hidden">
      {/* Animated background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          key={`glow-${currentStep}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] ${slide.bgGlow} rounded-full blur-[120px]`}
        />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-usdt-green/20 text-usdt-green flex items-center justify-center font-black text-xs">₮</span>
          <span className="text-sm font-extrabold text-text-primary tracking-tight font-sans">TetherStream</span>
        </div>
        
        {!isLast && (
          <button 
            onClick={handleSkip}
            className="text-[11px] font-semibold text-text-tertiary hover:text-text-secondary px-3 py-1.5 rounded-full bg-white/5 border border-white/8 transition-colors"
          >
            Skip
          </button>
        )}
      </div>

      {/* Slide content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 max-w-sm mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center w-full"
          >
            {/* Icon */}
            <div className="relative mb-8">
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${slide.gradient} blur-2xl opacity-30 scale-125`} />
              <div className={`relative w-[72px] h-[72px] rounded-3xl bg-gradient-to-br ${slide.gradient} text-white flex items-center justify-center shadow-2xl border border-white/20`}>
                {slide.icon}
              </div>
            </div>

            {/* Title */}
            <h2 className="text-[22px] font-black text-text-primary tracking-tight font-sans leading-tight mb-4">
              {slide.title}
            </h2>

            {/* Copy — preserve newlines */}
            <div className="space-y-2">
              {slide.copy.split('\n\n').map((paragraph, i) => (
                <p key={i} className="text-[13px] text-text-secondary leading-relaxed font-medium font-sans">
                  {paragraph.startsWith('•') ? (
                    <span className="text-left block">{paragraph}</span>
                  ) : paragraph}
                </p>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 max-w-sm mx-auto w-full px-8 pb-10 space-y-5">
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, idx) => (
            <motion.div
              key={idx}
              animate={{
                width: idx === currentStep ? 24 : 6,
                opacity: idx === currentStep ? 1 : 0.25,
              }}
              transition={{ duration: 0.3 }}
              className={`h-[6px] rounded-full ${
                idx === currentStep 
                  ? `bg-gradient-to-r ${slide.gradient}` 
                  : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleNext}
          className={`w-full py-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg press-feedback transition-all ${
            isLast
              ? 'bg-usdt-green text-[#06070b] shadow-usdt-green/25 hover:brightness-110'
              : 'bg-white/10 text-text-primary border border-white/10 hover:bg-white/15'
          }`}
        >
          {isLast ? (
            <>
              <Sparkles size={16} />
              <span>Continue</span>
            </>
          ) : (
            <>
              <span>Next</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
