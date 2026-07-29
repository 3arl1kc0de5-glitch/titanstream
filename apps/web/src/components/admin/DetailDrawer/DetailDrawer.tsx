import type React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export const DetailDrawer: React.FC<DetailDrawerProps> = ({
  isOpen, onClose, title, children, width = 'sm:max-w-lg',
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
        {/* Mobile: full-screen overlay from bottom; Desktop: side drawer */}
        <motion.div
          initial={{ y: '100%', x: 0 }}
          animate={{ y: 0, x: 0 }}
          exit={{ y: '100%', x: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className={`
            fixed inset-x-0 bottom-0 top-0 sm:top-0 sm:right-0 sm:left-auto sm:bottom-0
            w-full sm:w-full ${width}
            z-50 bg-card-bg sm:border-l border-border shadow-2xl
            flex flex-col
            sm:rounded-none rounded-t-2xl
          `}
        >
          {/* Mobile: pull-down handle */}
          <div className="sm:hidden flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-text-tertiary/40" />
          </div>

          <div className="flex items-center justify-between px-4 py-3 sm:p-4 border-b border-border">
            <h3 className="text-base sm:text-lg font-bold text-text-primary truncate">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-control-bg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="Close drawer"
            >
              <X size={20} className="text-text-secondary" />
            </button>
          </div>

          {/* Scrollable content with bottom safe area for mobile */}
          <div className="flex-1 overflow-y-auto p-4 pb-8 sm:pb-4">
            {children}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);
