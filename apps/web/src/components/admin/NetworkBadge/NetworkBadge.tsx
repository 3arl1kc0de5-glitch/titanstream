import type React from 'react';

interface NetworkBadgeProps {
  network: string;
  className?: string;
}

const networkColors: Record<string, string> = {
  'TRC-20': 'bg-usdt-green/15 text-usdt-green',
  'ERC-20': 'bg-ton-blue/15 text-ton-blue',
  'BEP-20': 'bg-gold/15 text-gold',
  TON: 'bg-ton-blue/15 text-ton-blue',
  Polygon: 'bg-error-red/15 text-error-red',
  Solana: 'bg-white/10 text-text-primary',
};

export const NetworkBadge: React.FC<NetworkBadgeProps> = ({ network, className = '' }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${networkColors[network] || 'bg-control-bg text-text-secondary'} ${className}`}>
    {network}
  </span>
);
