import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Cpu, Zap, ChevronRight, X, Sparkles } from 'lucide-react';

interface MachineEducationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MachineEducationModal: React.FC<MachineEducationModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const cards = [
    {
      title: 'Cloud Demand',
      icon: <Server size={36} className="text-usdt-green" />,
      sentence: 'Cloud companies rent computing power every day.',
    },
    {
      title: 'Capacity Allocation',
      icon: <Cpu size={36} className="text-cyan-400" />,
      sentence:
        'Your machine gives you access to a share of that computing capacity, and projected earnings are based on the platform\'s economic model.',
    },
    {
      title: 'Capacity Scaling',
      icon: <Zap size={36} className="text-amber-400" />,
      sentence:
        'Larger machines can process more work, which is why they have higher projected daily earnings.',
    },
  ];

  if (!isOpen) return null;

  const currentCard = cards[currentStep];

  const handleNext = () => {
    if (currentStep < cards.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      localStorage.setItem('has_seen_machine_education_v2', 'true');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-sm glass-panel p-6 rounded-3xl border border-usdt-green/40 bg-[#0c0e15] shadow-2xl flex flex-col gap-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-usdt-green" />
              <span className="text-xs font-black uppercase tracking-wider text-text-primary">
                Cloud Machine Overview ({currentStep + 1}/3)
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-text-tertiary hover:text-white"
            >
              <X size={14} />
            </button>
          </div>

          {/* Card Body — Exactly One Sentence */}
          <div className="flex flex-col items-center text-center space-y-4 py-3">
            <div className="w-16 h-16 rounded-2xl bg-usdt-green/10 border border-usdt-green/30 flex items-center justify-center shadow-lg shadow-usdt-green/10">
              {currentCard.icon}
            </div>

            <h3 className="text-base font-black text-text-primary tracking-tight">{currentCard.title}</h3>

            <p className="text-sm font-medium text-text-secondary leading-relaxed px-2">
              "{currentCard.sentence}"
            </p>
          </div>

          {/* Step Indicators & Action Button */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              {cards.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep ? 'w-6 bg-usdt-green' : 'w-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="px-5 py-2 rounded-xl bg-usdt-green text-app-bg font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-usdt-green/20 hover:brightness-110 active:scale-95 transition-all"
            >
              <span>{currentStep === cards.length - 1 ? 'Get Started' : 'Next'}</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
