import type React from 'react';
import { useState, useEffect } from 'react';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { MetricCard, MetricCardGrid } from '@/components/admin/MetricCard';
import { withdrawalService, type WithdrawalSession } from '@/services/withdrawalService';

const statusVariant: Record<string, 'info' | 'default' | 'warning' | 'success' | 'danger'> = {
  CREATED: 'info',
  RISK_CHECK: 'warning',
  PENDING_APPROVAL: 'warning',
  PROCESSING: 'info',
  COMPLETED: 'success',
  REJECTED: 'danger',
};

const columns: Column<WithdrawalSession>[] = [
  { key: 'reference', label: 'Reference', sortable: true, width: 'w-[120px]' },
  { key: 'destination', label: 'Destination', width: 'w-[160px]',
    render: (w) => <span className="text-xs font-mono text-text-secondary">{w.destination}</span> },
  { key: 'amount', label: 'Amount', sortable: true, width: 'w-[100px]',
    render: (w) => <span className="font-semibold">${w.amount} {w.asset}</span> },
  { key: 'netAmount', label: 'Net Amount', sortable: true, width: 'w-[100px]',
    render: (w) => <span className="font-semibold text-usdt-green">${w.netAmount}</span> },
  { key: 'status', label: 'Status', sortable: true, width: 'w-[120px]',
    render: (w) => <StatusBadge label={w.status} variant={statusVariant[w.status] || 'default'} dot /> },
  { key: 'createdAt', label: 'Created At', sortable: true, width: 'w-[140px]',
    render: (w) => <span className="text-xs text-text-tertiary">{new Date(w.createdAt).toLocaleString()}</span> },
];

export const WithdrawalsPage: React.FC = () => {
  const [withdrawalsList, setWithdrawalsList] = useState<WithdrawalSession[]>([]);
  const [selected, setSelected] = useState<WithdrawalSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    withdrawalService
      .getHistory()
      .then((res) => setWithdrawalsList(res?.items || []))
      .catch(() => setWithdrawalsList([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <MetricCardGrid columns={2}>
        <MetricCard label="Pending Withdrawals" value={withdrawalsList.filter(w => w.status !== 'COMPLETED' && w.status !== 'REJECTED').length.toString()} icon="Clock" variant="gold" />
        <MetricCard label="Total Requests" value={withdrawalsList.length.toString()} icon="ArrowUpFromLine" variant="green" />
      </MetricCardGrid>

      {loading ? (
        <div className="p-8 text-center bg-card-bg rounded-xl border border-white/5 text-xs text-text-tertiary">
          Loading withdrawal queue...
        </div>
      ) : withdrawalsList.length === 0 ? (
        <div className="p-8 text-center bg-card-bg rounded-xl border border-white/5 space-y-1">
          <p className="text-xs font-bold text-text-primary">No withdrawal requests recorded yet</p>
          <p className="text-[11px] text-text-tertiary">User payout requests will appear here for processing.</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={withdrawalsList}
          keyExtractor={(w) => w.withdrawalId}
          onRowClick={(w) => setSelected(w)}
          searchable
          searchPlaceholder="Search by reference or address..."
          pageSize={10}
        />
      )}

      {selected && (
        <DetailDrawer isOpen={!!selected} onClose={() => setSelected(null)} title={`Withdrawal #${selected.reference}`}>
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <StatusBadge label={selected.status} variant={statusVariant[selected.status] || 'default'} dot />
              <span className="font-bold text-text-primary">${selected.amount} {selected.asset}</span>
            </div>
            <div className="bg-card-bg rounded-xl p-3 space-y-2">
              <div><span className="text-text-tertiary">Destination:</span> <span className="font-mono text-text-primary">{selected.destination}</span></div>
              <div><span className="text-text-tertiary">Fee:</span> <span className="text-text-primary">${selected.fee}</span></div>
              <div><span className="text-text-tertiary">Net Amount:</span> <span className="text-usdt-green font-bold">${selected.netAmount}</span></div>
              <div><span className="text-text-tertiary">Created:</span> <span className="text-text-primary">{new Date(selected.createdAt).toLocaleString()}</span></div>
            </div>
          </div>
        </DetailDrawer>
      )}
    </div>
  );
};
