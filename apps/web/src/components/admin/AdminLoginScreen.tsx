import type React from 'react';
import { useState } from 'react';
import { ShieldCheck, Key, ArrowRight, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

interface AdminLoginScreenProps {
  onAuthenticated: () => void;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({ onAuthenticated }) => {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Token is required');
      return;
    }
    // Set token in localStorage and call onAuthenticated
    localStorage.setItem('auth_token', token.trim());
    onAuthenticated();
  };

  const handleDevBypass = () => {
    // Inject the fast-path super admin dev token supported by NestJS AdminAuthGuard
    const devToken = 'admin-token:SUPER_ADMIN:dev_super_admin';
    localStorage.setItem('auth_token', devToken);
    onAuthenticated();
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-app-bg text-text-primary p-4 select-none">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,230,118,0.15),transparent_60%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-6 glass-panel rounded-3xl border border-white/10 shadow-2xl bg-gradient-to-b from-control-bg/60 to-app-bg-secondary/80 flex flex-col items-center text-center gap-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-usdt-green/25 text-usdt-green border border-usdt-green/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,230,118,0.3)] animate-pulse">
          <ShieldCheck size={36} />
        </div>

        <div>
          <h2 className="text-xl font-extrabold tracking-tight font-sans text-text-primary">
            TetherStream Portal
          </h2>
          <p className="text-xs text-text-secondary mt-1 font-sans font-medium">
            Administrative Control Panel & Financial Sweeper Engine
          </p>
        </div>

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary">
              <Key size={16} />
            </span>
            <input
              type="password"
              placeholder="Enter Admin Secret / Auth Token"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setError(null);
              }}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-app-bg border border-white/10 text-sm placeholder-text-tertiary focus:outline-none focus:border-usdt-green/50 font-mono transition-all"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs font-bold text-red-400 bg-red-400/10 border border-red-400/20 p-3 rounded-xl text-left">
              <ShieldAlert size={14} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full bg-usdt-green hover:bg-usdt-green/90 text-black font-extrabold text-sm py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
          >
            <span>Verify Identity</span>
            <ArrowRight size={16} />
          </motion.button>
        </form>

        <div className="w-full border-t border-white/5 my-1" />

        <div className="w-full space-y-2">
          <p className="text-[10px] text-text-tertiary font-medium">
            Deploying in development/sandbox mode? Bypasses authentication check via Fast Path.
          </p>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleDevBypass}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-text-secondary font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-colors"
          >
            Bypass to Dev Super Admin
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
