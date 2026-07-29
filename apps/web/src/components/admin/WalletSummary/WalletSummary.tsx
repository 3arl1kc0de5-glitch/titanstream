import type React from 'react';
import { Wallet, ExternalLink } from 'lucide-react';
import type { Wallet as WalletType } from '@/data/mock/treasury';
import { StatusBadge } from '@/components/admin/StatusBadge';

interface WalletSummaryProps {
  wallet: WalletType;
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
      <div><span className="text-text-tertiary text-xs">Balance</span><div className="text-text-primary font-bold">${wallet.balance.toLocaleString()}</div></div>
      <div><span className="text-text-tertiary text-xs">Available</span><div className="text-text-primary font-bold">${wallet.available.toLocaleString()}</div></div>
      <div><span className="text-text-tertiary text-xs">Reserved</span><div className="text-usdt-green font-bold">${wallet.reserved.toLocaleString()}</div></div>
      <div><span className="text-text-tertiary text-xs">Pending</span><div className="text-gold font-bold">${wallet.pending.toLocaleString()}</div></div>
    </div>
    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-text-tertiary">
      <span>In: ${wallet.incoming.toLocaleString()}</span>
      <span>Out: ${wallet.outgoing.toLocaleString()}</span>
      <span>Sync: {wallet.lastSync}</span>
    </div>
  </div>
);
