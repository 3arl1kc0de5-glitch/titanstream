import type React from 'react';
import { useState } from 'react';
import { withdrawals, type Withdrawal } from '@/data/mock/withdrawals';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { MetricCard, MetricCardGrid } from '@/components/admin/MetricCard';
import { NetworkBadge } from '@/components/admin/NetworkBadge';
import { ChevronDown, Clock } from 'lucide-react';
import { FinancialObjectViewer } from '@/components/FinancialObjectViewer';

const statusVariant: Record<string, 'info' | 'default' | 'warning' | 'success' | 'danger'> = {
  requested: 'info',
  queued: 'default',
  broadcasting: 'warning',
  confirming: 'warning',
  completed: 'success',
  failed: 'danger',
};

const riskColor = (score: number) => {
  if (score >= 80) return 'text-error-red';
  if (score >= 50) return 'text-gold';
  return 'text-usdt-green';
};

const columns: Column<Withdrawal>[] = [
  { key: 'withdrawalId', label: 'ID', sortable: true, width: 'w-[100px]' },
  { key: 'user', label: 'User', sortable: true, width: 'w-[130px]',
    render: (w: Withdrawal) => w.user.name,
    mobile: (w: Withdrawal) => ({ label: 'User', value: w.user.name }) },
  { key: 'destination', label: 'Destination', width: 'w-[140px]',
    render: (w: Withdrawal) => <span className="text-xs font-mono text-text-secondary">{w.destination}</span> },
  { key: 'network', label: 'Network', sortable: true, width: 'w-[90px]',
    render: (w: Withdrawal) => <NetworkBadge network={w.network} />,
    mobile: (w: Withdrawal) => ({ label: 'Network', value: <NetworkBadge network={w.network} /> }) },
  { key: 'amount', label: 'Amount', sortable: true, width: 'w-[100px]',
    render: (w: Withdrawal) => <span className="font-semibold">{w.amount} {w.currency}</span>,
    mobile: (w: Withdrawal) => ({ label: 'Amount', value: <span className="font-bold">{w.amount} {w.currency}</span> }) },
  { key: 'status', label: 'Status', sortable: true, width: 'w-[110px]',
    render: (w: Withdrawal) => <StatusBadge label={w.status} variant={statusVariant[w.status]} dot />,
    mobile: (w: Withdrawal) => ({ label: 'Status', value: <StatusBadge label={w.status} variant={statusVariant[w.status]} dot /> }) },
  { key: 'riskScore', label: 'Risk', sortable: true, width: 'w-[70px]',
    render: (w: Withdrawal) => <span className={`font-semibold ${riskColor(w.riskScore)}`}>{w.riskScore}%</span>,
    mobile: (w: Withdrawal) => ({ label: 'Risk', value: <span className={`font-semibold ${riskColor(w.riskScore)}`}>{w.riskScore}%</span> }) },
];

const WithdrawalMobileCard: React.FC<{ w: Withdrawal; onClick: () => void }> = ({ w, onClick }) => (
  <div onClick={onClick} className="active:bg-white/[0.03]">
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-text-primary">{w.withdrawalId}</span>
        <StatusBadge label={w.status} variant={statusVariant[w.status]} dot />
      </div>
      <span className="text-sm font-bold">{w.amount} {w.currency}</span>
    </div>
    <div className="flex items-center justify-between text-xs text-text-tertiary">
      <span>{w.user.name}</span>
      <NetworkBadge network={w.network} />
      <span className={`font-semibold ${riskColor(w.riskScore)}`}>{w.riskScore}% Risk</span>
    </div>
    <div className="flex gap-2 mt-3">
      <button className="flex-1 py-2.5 rounded-lg bg-usdt-green text-app-bg text-xs font-bold min-h-[36px]">Approve</button>
      <button className="flex-1 py-2.5 rounded-lg bg-error-red/15 text-error-red text-xs font-bold min-h-[36px]">Reject</button>
    </div>
  </div>
);

export const WithdrawalsPage: React.FC = () => {
  const [selected, setSelected] = useState<Withdrawal | null>(null);
  const totalVolume = withdrawals.reduce((s, w) => s + w.amount, 0);

  return (
    <div className="space-y-4">
      <MetricCardGrid columns={2}>
        <MetricCard label="Pending" value={withdrawals.filter(w => w.status !== 'completed' && w.status !== 'failed').length.toString()} change={-8.3} icon="Clock" variant="gold" />
        <MetricCard label="24h Volume" value={`${totalVolume.toFixed(1)} BTC.eq`} change={5.2} icon="ArrowUpFromLine" variant="green" />
      </MetricCardGrid>

      <DataTable
        columns={columns}
        data={withdrawals as any}
        keyExtractor={(w: any) => w.id}
        onRowClick={(w: any) => setSelected(w as Withdrawal)}
        searchable
        searchPlaceholder="Search by ID, user, or address..."
        pageSize={10}
        mobileCard
        mobileCardRender={(item: any) => (
          <WithdrawalMobileCard w={item as Withdrawal} onClick={() => setSelected(item as Withdrawal)} />
        )}
      />

      <DetailDrawer isOpen={!!selected} onClose={() => setSelected(null)} title={`Withdrawal ${selected?.withdrawalId || ''}`}>
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <StatusBadge label={selected.status} variant={statusVariant[selected.status]} dot />
              <span className={`text-sm font-bold ${riskColor(selected.riskScore)}`}>{selected.riskScore}% Risk</span>
            </div>

            <div className="flex gap-2 sm:hidden">
              <button className="flex-1 py-3 rounded-xl bg-usdt-green text-app-bg text-sm font-bold min-h-[44px]">Approve</button>
              <button className="flex-1 py-3 rounded-xl bg-error-red/15 text-error-red text-sm font-bold min-h-[44px]">Reject</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-xs text-text-tertiary">User</span><p className="text-sm font-semibold">{selected.user.name}</p></div>
              <div><span className="text-xs text-text-tertiary">Telegram ID</span><p className="text-sm font-mono">{selected.user.telegramId}</p></div>
              <div><span className="text-xs text-text-tertiary">Amount</span><p className="text-sm font-bold">{selected.amount} {selected.currency}</p></div>
              <div><span className="text-xs text-text-tertiary">Network</span><p className="text-sm"><NetworkBadge network={selected.network} /></p></div>
              <div><span className="text-xs text-text-tertiary">Fee</span><p className="text-sm">{selected.fee} {selected.currency}</p></div>
              <div><span className="text-xs text-text-tertiary">Created</span><p className="text-sm text-xs">{selected.createdAt}</p></div>
            </div>
            <div className="bg-control-bg rounded-lg p-3">
              <span className="text-xs text-text-tertiary">Destination</span>
              <code className="text-xs text-text-secondary font-mono block break-all mt-1">{selected.destination}</code>
            </div>

            <div className="border-t border-border pt-4">
              <FinancialObjectViewer
                type="withdrawal"
                currentStatus={selected.status}
                referenceCode={selected.withdrawalId}
                createdAt={selected.createdAt}
                completedAt={selected.completedAt}
                additionalDetails={{
                  'Destination': selected.destination,
                  'Network': selected.network,
                  'Amount': `${selected.amount} ${selected.currency}`,
                }}
              />
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};
