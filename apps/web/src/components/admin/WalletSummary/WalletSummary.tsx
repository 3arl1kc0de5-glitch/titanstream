import type React from 'react';
import { Wallet as WalletIcon, ExternalLink } from 'lucide-react';
import { StatusBadge } from '@/components/admin/StatusBadge';

export interface Wallet {
  id: string;
  network: string;
  address: string;
  health: 'healthy' | 'warning' | 'critical';
  balance: number;
  available: number;
  reserved: number;
  pending: number;
  incoming: number;
  outgoing: number;
  lastSync: string;
}

interface WalletSummaryProps {
  wallet: Wallet;
  className?: string;
}

const healthVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  healthy: 'success',
  warning: 'warning',
  critical: 'danger',
};

export const WalletSummary: React.FC<WalletSummaryProps> = ({ wallet, className = '' }) => (
  <div className={`bg-card-bg rounded-xl p-4 border border-border/50 ${className}`}>
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-ton-blue/15 text-ton-blue">
          <Wallet size={16} />
        </div>
        <div>
          <span className="text-sm font-bold text-text-primary">{wallet.network}</span>
          <span className="text-xs text-text-tertiary block">{wallet.id}</span>
        </div>
      </div>
      <StatusBadge label={wallet.health} variant={healthVariant[wallet.health]} dot />
    </div>
    <div className="flex items-center gap-2 mb-3">
      <code className="text-xs text-text-secondary font-mono bg-control-bg px-2 py-1 rounded flex-1 truncate">
        {wallet.address}
      </code>
      <ExternalLink size={14} className="text-text-tertiary flex-shrink-0" />
    </div>
    <div className="grid grid-cols-2 gap-2 text-sm">
      <div><span className="text-text-tertiary text-xs">Balance</span><div className="text-text-primary font-bold">${(Number(wallet?.balance) || 0).toLocaleString()}</div></div>
      <div><span className="text-text-tertiary text-xs">Available</span><div className="text-text-primary font-bold">${(Number(wallet?.available) || 0).toLocaleString()}</div></div>
      <div><span className="text-text-tertiary text-xs">Reserved</span><div className="text-usdt-green font-bold">${(Number(wallet?.reserved) || 0).toLocaleString()}</div></div>
      <div><span className="text-text-tertiary text-xs">Pending</span><div className="text-gold font-bold">${(Number(wallet?.pending) || 0).toLocaleString()}</div></div>
    </div>
    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-text-tertiary">
      <span>In: ${(Number(wallet?.incoming) || 0).toLocaleString()}</span>
      <span>Out: ${(Number(wallet?.outgoing) || 0).toLocaleString()}</span>
      <span>Sync: {wallet?.lastSync || 'N/A'}</span>
    </div>
  </div>
);
