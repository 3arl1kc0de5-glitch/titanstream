import type React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Modal content */}
          <motion.div
            className="fixed inset-x-4 top-1/2 z-50 max-w-md mx-auto bg-card-bg rounded-2xl p-5 shadow-2xl"
            initial={{ opacity: 0, y: '-40%', scale: 0.95 }}
            animate={{ opacity: 1, y: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: '-40%', scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.175, 0.885, 0.32, 1.275] }}
          >
            <div className="flex items-center justify-between mb-4">
              {title && <h3 className="text-lg font-bold text-text-primary">{title}</h3>}
              <button
                onClick={onClose}
                className="press-feedback ml-auto p-1 rounded-full hover:bg-control-bg transition-colors"
                aria-label="Close modal"
              >
                <X size={20} className="text-text-secondary" />
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
