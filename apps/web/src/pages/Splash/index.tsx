import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader } from '../../components/Loader';

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFade(true);
      setTimeout(() => {
        onFinish?.();
      }, 300);
    }, 1500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-app-bg flex flex-col items-center justify-center p-6 transition-opacity duration-300 ${
        fade ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-6"
      >
        {/* TetherStream Emblem */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-usdt-green/30 blur-3xl animate-glow" />
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-usdt-green via-[#00c853] to-app-bg border-2 border-white/20 flex items-center justify-center text-app-bg font-extrabold text-6xl shadow-[0_0_40px_rgba(0,230,118,0.5)]">
            ₮
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 text-center font-sans">
          <h1 className="text-3xl font-extrabold text-gradient-usdt tracking-tight">TetherStream</h1>
          <p className="text-xs text-text-secondary tracking-wide font-semibold mt-1">Participate in the Cloud Computing Economy</p>
        </div>

        <Loader size="md" color="green" className="mt-4" />
      </motion.div>
    </div>
  );
};
