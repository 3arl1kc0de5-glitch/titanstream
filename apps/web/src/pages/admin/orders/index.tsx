import type React from 'react';
import { useState, useEffect } from 'react';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { paymentOrderService, type PaymentOrderRecord } from '@/services/paymentOrderService';
import { ExternalLink } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  CREATED: 'warning',
  AWAITING_PAYMENT: 'warning',
  AWAITING_VERIFICATION: 'info',
  APPROVED: 'success',
  POSTING_TO_LEDGER: 'info',
  COMPLETED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'neutral',
  CANCELLED: 'neutral',
};

const columns: Column<PaymentOrderRecord>[] = [
  { key: 'reference', label: 'Ref', sortable: true, width: 'w-[100px]' },
  {
    key: 'type', label: 'Type', sortable: true, width: 'w-[120px]',
    render: (o) => <span className="text-xs font-bold">{o.type}</span>,
  },
  {
    key: 'paymentMethod', label: 'Method', sortable: true, width: 'w-[120px]',
    render: (o) => <span className="text-xs capitalize">{o.paymentMethod || o.network}</span>,
  },
  {
    key: 'amount', label: 'Amount', sortable: true, width: 'w-[100px]',
    render: (o) => <span className="font-semibold">${(Number(o.amount) || 0).toLocaleString()} USDT</span>,
  },
  {
    key: 'status', label: 'Status', sortable: true, width: 'w-[120px]',
    render: (o) => <StatusBadge label={o.status} variant={statusVariant[o.status] || 'default'} dot />,
  },
  {
    key: 'createdAt', label: 'Created At', sortable: true, width: 'w-[140px]',
    render: (o) => <span className="text-xs text-text-tertiary">{new Date(o.createdAt).toLocaleString()}</span>,
  },
  {
    key: 'actions', label: '', width: 'w-[60px]',
    render: () => <ExternalLink size={14} className="text-text-tertiary" />,
  },
];

export const OrdersPage: React.FC = () => {
  const [ordersList, setOrdersList] = useState<PaymentOrderRecord[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PaymentOrderRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentOrderService
      .adminListOrders()
      .then((data) => setOrdersList(data || []))
      .catch(() => setOrdersList([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-text-primary">Payment Orders ({ordersList.length})</h2>
      </div>

      {loading ? (
        <div className="p-8 text-center bg-card-bg rounded-xl border border-white/5 text-xs text-text-tertiary">
          Loading payment orders...
        </div>
      ) : ordersList.length === 0 ? (
        <div className="p-8 text-center bg-card-bg rounded-xl border border-white/5 space-y-1">
          <p className="text-xs font-bold text-text-primary">No payment orders recorded yet</p>
          <p className="text-[11px] text-text-tertiary">New deposit and payout payment orders will appear here.</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={ordersList}
          keyExtractor={(o) => o.id}
          onRowClick={(o) => setSelectedOrder(o)}
          searchable
          searchKeys={['reference', 'type', 'paymentMethod', 'status']}
        />
      )}

      {selectedOrder && (
        <DetailDrawer
          title={`Order #${selectedOrder.reference}`}
          onClose={() => setSelectedOrder(null)}
          sections={[
            {
              title: 'Order Information',
              items: [
                { label: 'Reference', value: selectedOrder.reference },
                { label: 'Type', value: selectedOrder.type },
                { label: 'Amount', value: `$${selectedOrder.amount} ${selectedOrder.asset}` },
                { label: 'Status', value: selectedOrder.status },
                { label: 'Network', value: selectedOrder.network || 'N/A' },
                { label: 'Country', value: selectedOrder.country || 'N/A' },
                { label: 'Created At', value: new Date(selectedOrder.createdAt).toLocaleString() },
              ],
            },
          ]}
        />
      )}
    </div>
  );
};
