import React from 'react';
import { motion } from 'framer-motion';
import { X, Lightbulb } from 'lucide-react';
import { useEducationStore, type EducationKey } from '../store/useEducationStore';
import { useTelegram } from '../context/TelegramContext';

interface EducationCardProps {
  educationKey: EducationKey;
  title: string;
  body: string;
  icon?: React.ReactNode;
}

/**
 * Contextual education card that appears inline before a user's first
 * interaction with a feature. Dismissed permanently on close.
 */
export const EducationCard: React.FC<EducationCardProps> = ({
  educationKey,
  title,
  body,
  icon,
}) => {
  const { shouldShowEducation, dismissEducation } = useEducationStore();
  const { hapticFeedback } = useTelegram();

  if (!shouldShowEducation(educationKey)) return null;

  const handleDismiss = () => {
    hapticFeedback.impactOccurred('light');
    dismissEducation(educationKey);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-2xl p-4 bg-gradient-to-br from-cyan-500/8 via-purple-500/5 to-transparent border border-cyan-500/20 shadow-lg overflow-hidden"
    >
      {/* Decorative glow */}
      <div className="absolute -top-8 -right-8 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start gap-3 relative z-10">
        {/* Icon */}
        <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-0.5">
          {icon || <Lightbulb size={18} />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="text-xs font-extrabold text-text-primary font-sans tracking-tight">
              {title}
            </h4>
            <button
              onClick={handleDismiss}
              className="press-feedback p-1 rounded-full bg-white/5 border border-white/10 text-text-tertiary hover:text-text-secondary flex-shrink-0"
              aria-label="Dismiss"
            >
              <X size={12} />
            </button>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed font-medium font-sans">
            {body}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
