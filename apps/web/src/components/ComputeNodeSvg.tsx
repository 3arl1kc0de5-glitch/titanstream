import React from 'react';

interface ComputeNodeSvgProps {
  tierCode: string;
  isPopular?: boolean;
}

export const ComputeNodeSvg: React.FC<ComputeNodeSvgProps> = ({ tierCode, isPopular }) => {
  switch (tierCode) {
    case 'TS_C10':
      // Starter Node — Compact Server Blade
      return (
        <div className="relative w-14 h-14 rounded-2xl bg-[#0b0e17] border border-white/10 flex items-center justify-center overflow-hidden shadow-inner group">
          <svg viewBox="0 0 64 64" className="w-9 h-9">
            <rect x="12" y="18" width="40" height="10" rx="2" fill="#1e2436" stroke="#26a17b" strokeWidth="1.5" />
            <rect x="12" y="36" width="40" height="10" rx="2" fill="#1e2436" stroke="#26a17b" strokeWidth="1.5" />
            <circle cx="20" cy="23" r="1.8" fill="#00e676" className="animate-ping" />
            <circle cx="20" cy="41" r="1.8" fill="#00e676" />
            <line x1="26" y1="23" x2="46" y2="23" stroke="#26a17b" strokeWidth="1.5" strokeDasharray="2 2" />
            <line x1="26" y1="41" x2="46" y2="41" stroke="#26a17b" strokeWidth="1.5" strokeDasharray="2 2" />
          </svg>
        </div>
      );

    case 'TS_A50':
      // Advanced Node — Dual Circuit Processor
      return (
        <div className="relative w-14 h-14 rounded-2xl bg-[#0b0e17] border border-usdt-green/40 flex items-center justify-center overflow-hidden shadow-inner group">
          <svg viewBox="0 0 64 64" className="w-9 h-9">
            <path d="M8 32 H24 M40 32 H56 M32 8 V24 M32 40 V56" stroke="rgba(0,230,118,0.3)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="32" cy="32" r="15" fill="none" stroke="#00e676" strokeWidth="2" className="animate-pulse" />
            <rect x="24" y="24" width="16" height="16" rx="3" fill="#00e676" opacity="0.85" />
            <circle cx="8" cy="32" r="2.5" fill="#00e676" />
            <circle cx="56" cy="32" r="2.5" fill="#00e676" />
            <circle cx="32" cy="8" r="2.5" fill="#00e676" />
            <circle cx="32" cy="56" r="2.5" fill="#00e676" />
          </svg>
        </div>
      );

    case 'TS_P250':
      // High-Performance — Multi-Core GPU Matrix Cluster (Most Popular)
      return (
        <div className="relative w-14 h-14 rounded-2xl bg-[#07130c] border border-usdt-green flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(0,230,118,0.25)] group">
          <svg viewBox="0 0 64 64" className="w-10 h-10">
            <rect x="14" y="14" width="16" height="16" rx="3" fill="#00e676" opacity="0.9" />
            <rect x="34" y="14" width="16" height="16" rx="3" fill="#00e676" opacity="0.9" />
            <rect x="14" y="34" width="16" height="16" rx="3" fill="#00e676" opacity="0.9" />
            <rect x="34" y="34" width="16" height="16" rx="3" fill="#00e676" opacity="0.9" />
            <path d="M30 22 H34 M22 30 V34 M42 30 V34 M30 42 H34" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            <circle cx="32" cy="32" r="4" fill="#ffffff" className="animate-ping" />
          </svg>
        </div>
      );

    case 'TS_X1000':
      // Professional — Quantum AI Parallel Super-Core
      return (
        <div className="relative w-14 h-14 rounded-2xl bg-[#110a1f] border border-purple-500/50 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(168,85,247,0.25)] group">
          <svg viewBox="0 0 64 64" className="w-10 h-10">
            <circle cx="32" cy="32" r="20" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="4 4" className="animate-spin" style={{ animationDuration: '8s' }} />
            <polygon points="32,14 47,23 47,41 32,50 17,41 17,23" fill="none" stroke="#e040fb" strokeWidth="2" />
            <polygon points="32,20 42,26 42,38 32,44 22,38 22,26" fill="#e040fb" opacity="0.75" />
            <circle cx="32" cy="32" r="3" fill="#ffffff" className="animate-pulse" />
          </svg>
        </div>
      );

    case 'TS_Q2500':
      // Enterprise — HyperScale Supercomputer Cluster
      return (
        <div className="relative w-14 h-14 rounded-2xl bg-[#1a1205] border border-amber-400/60 flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(251,191,36,0.3)] group">
          <svg viewBox="0 0 64 64" className="w-10 h-10">
            <rect x="10" y="10" width="44" height="44" rx="6" fill="none" stroke="#fbbf24" strokeWidth="2" />
            <rect x="18" y="18" width="28" height="28" rx="4" fill="#fbbf24" opacity="0.2" stroke="#f59e0b" strokeWidth="1.5" />
            <circle cx="32" cy="32" r="8" fill="#fbbf24" className="animate-pulse" />
            <line x1="32" y1="4" x2="32" y2="10" stroke="#fbbf24" strokeWidth="2" />
            <line x1="32" y1="54" x2="32" y2="60" stroke="#fbbf24" strokeWidth="2" />
            <line x1="4" y1="32" x2="10" y2="32" stroke="#fbbf24" strokeWidth="2" />
            <line x1="54" y1="32" x2="60" y2="32" stroke="#fbbf24" strokeWidth="2" />
          </svg>
        </div>
      );

    default:
      return null;
  }
};
