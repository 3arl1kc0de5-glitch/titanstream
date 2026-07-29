import type React from 'react';
import { useState } from 'react';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { orders, type Order } from '@/data/mock/orders';
import { Chip } from '@/components/Chip';
import { Clock, ExternalLink, ArrowUpRight, ShieldAlert, MoreHorizontal, ChevronDown } from 'lucide-react';

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  pending: 'warning',
  active: 'info',
  completed: 'success',
  failed: 'danger',
  refunded: 'neutral',
  disputed: 'danger',
};

const riskColor = (score: number) => {
  if (score >= 80) return 'text-error-red';
  if (score >= 50) return 'text-gold';
  return 'text-usdt-green';
};

const riskBg = (score: number) => {
  if (score >= 80) return 'bg-error-red/10 text-error-red';
  if (score >= 50) return 'bg-gold/10 text-gold';
  return 'bg-usdt-green/10 text-usdt-green';
};

const columns: Column<Order>[] = [
  { key: 'orderId', label: 'Order ID', sortable: true, width: 'w-[100px]' },
  {
    key: 'user', label: 'User', sortable: true, width: 'w-[140px]',
    render: (o) => <div><div className="text-sm">{o.user.name}</div><div className="text-xs text-text-tertiary">{o.user.username}</div></div>,
    mobile: (o) => ({ label: 'User', value: <span className="font-semibold">{o.user.name}</span> }),
  },
  {
    key: 'merchant', label: 'Merchant', sortable: true, width: 'w-[120px]',
    render: (o) => o.merchant.name,
    mobile: (o) => ({ label: 'Merchant', value: o.merchant.name }),
  },
  {
    key: 'paymentMethod', label: 'Payment', sortable: true, width: 'w-[100px]',
    render: (o) => <span className="text-xs capitalize">{o.paymentMethod.replace('_', ' ')}</span>,
    mobile: (o) => ({ label: 'Payment', value: <span className="capitalize">{o.paymentMethod.replace('_', ' ')}</span> }),
  },
  {
    key: 'amount', label: 'Amount', sortable: true, width: 'w-[100px]',
    render: (o) => <span className="font-semibold">${o.amount.toLocaleString()}</span>,
    mobile: (o) => ({ label: 'Amount', value: <span className="font-bold text-base">${o.amount.toLocaleString()}</span> }),
  },
  {
    key: 'status', label: 'Status', sortable: true, width: 'w-[100px]',
    render: (o) => <StatusBadge label={o.status} variant={statusVariant[o.status]} dot />,
    mobile: (o) => ({ label: 'Status', value: <StatusBadge label={o.status} variant={statusVariant[o.status]} dot /> }),
  },
  {
    key: 'assignedMerchant', label: 'Assigned', sortable: true, width: 'w-[120px]',
    render: (o) => o.assignedMerchant,
  },
  {
    key: 'createdAt', label: 'Age', sortable: true, width: 'w-[80px]',
    render: (o) => <span className="text-xs text-text-tertiary">{o.age}</span>,
    mobile: (o) => ({ label: 'Age', value: <span className="text-text-tertiary">{o.age}</span> }),
  },
  {
    key: 'riskScore', label: 'Risk', sortable: true, width: 'w-[80px]',
    render: (o) => <span className={`font-semibold text-sm ${riskColor(o.riskScore)}`}>{o.riskScore}%</span>,
    mobile: (o) => ({ label: 'Risk', value: <span className={`font-semibold ${riskColor(o.riskScore)}`}>{o.riskScore}%</span> }),
  },
  { key: 'actions', label: '', width: 'w-[60px]',
    render: () => <ExternalLink size={14} className="text-text-tertiary" /> },
];

const OrderMobileCard: React.FC<{ order: Order; onClick: () => void }> = ({ order, onClick }) => (
  <div onClick={onClick} className="active:bg-white/[0.03]">
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-text-primary">{order.orderId}</span>
        <StatusBadge label={order.status} variant={statusVariant[order.status]} dot />
      </div>
      <span className="text-base font-bold">${order.amount.toLocaleString()}</span>
    </div>
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-3 text-text-tertiary">
        <span>{order.user.name}</span>
        <span className="flex items-center gap-1"><Clock size={10} />{order.age}</span>
      </div>
      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${riskBg(order.riskScore)}`}>
        {order.riskScore}% Risk
      </span>
    </div>
    <div className="flex gap-2 mt-3">
      {order.status === 'pending' && (
        <>
          <button className="flex-1 py-2.5 rounded-lg bg-usdt-green text-app-bg text-xs font-bold flex items-center justify-center gap-1 min-h-[36px]">
            <ArrowUpRight size={14} /> Process
          </button>
          <button className="flex-1 py-2.5 rounded-lg bg-gold/15 text-gold text-xs font-bold flex items-center justify-center gap-1 min-h-[36px]">
            <ShieldAlert size={14} /> Escalate
          </button>
        </>
      )}
      {order.status === 'active' && (
        <button className="flex-1 py-2.5 rounded-lg bg-usdt-green text-app-bg text-xs font-bold flex items-center justify-center gap-1 min-h-[36px]">
          <ArrowUpRight size={14} /> Complete
        </button>
      )}
      <button className="p-2.5 rounded-lg bg-control-bg text-text-secondary min-w-[36px] min-h-[36px] flex items-center justify-center">
        <MoreHorizontal size={16} />
      </button>
    </div>
  </div>
);

export const OrdersPage: React.FC = () => {
  const [selected, setSelected] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const filtered = statusFilter ? orders.filter((o) => o.status === statusFilter) : orders;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
        <Chip label="All" active={!statusFilter} onClick={() => setStatusFilter(null)} />
        <Chip label="Pending" active={statusFilter === 'pending'} onClick={() => setStatusFilter('pending')} />
        <Chip label="Active" active={statusFilter === 'active'} onClick={() => setStatusFilter('active')} />
        <Chip label="Completed" active={statusFilter === 'completed'} onClick={() => setStatusFilter('completed')} />
        <Chip label="Failed" active={statusFilter === 'failed'} onClick={() => setStatusFilter('failed')} />
        <Chip label="Disputed" active={statusFilter === 'disputed'} onClick={() => setStatusFilter('disputed')} />
      </div>

      <DataTable
        columns={columns}
        data={filtered as any}
        keyExtractor={(o: any) => o.id}
        onRowClick={(o: any) => setSelected(o as Order)}
        searchable
        searchPlaceholder="Search by Order ID, User, Telegram ID..."
        pageSize={8}
        mobileCard
        mobileCardRender={(item: any) => (
          <OrderMobileCard order={item as Order} onClick={() => setSelected(item as Order)} />
        )}
      />

      <DetailDrawer isOpen={!!selected} onClose={() => setSelected(null)} title={`Order ${selected?.orderId || ''}`}>
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <StatusBadge label={selected.status} variant={statusVariant[selected.status]} dot />
              <span className={`text-lg font-bold ${riskColor(selected.riskScore)}`}>{selected.riskScore}% Risk</span>
            </div>

            {/* Mobile action buttons in drawer */}
            <div className="flex gap-2 sm:hidden">
              <button className="flex-1 py-3 rounded-xl bg-usdt-green text-app-bg text-sm font-bold min-h-[44px]">
                {selected.status === 'pending' ? 'Process Order' : selected.status === 'active' ? 'Complete Order' : 'View Details'}
              </button>
              <button className="px-4 py-3 rounded-xl bg-control-bg text-text-secondary text-sm font-semibold min-h-[44px]">
                Escalate
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-xs text-text-tertiary">User</span><p className="text-sm font-semibold">{selected.user.name}</p><p className="text-xs text-text-tertiary">{selected.user.username}</p></div>
              <div><span className="text-xs text-text-tertiary">Merchant</span><p className="text-sm font-semibold">{selected.merchant.name}</p></div>
              <div><span className="text-xs text-text-tertiary">Amount</span><p className="text-sm font-bold">${selected.amount.toLocaleString()} {selected.currency}</p></div>
              <div><span className="text-xs text-text-tertiary">Payment</span><p className="text-sm capitalize">{selected.paymentMethod.replace('_', ' ')}</p></div>
              <div><span className="text-xs text-text-tertiary">Assigned</span><p className="text-sm">{selected.assignedMerchant}</p></div>
              <div><span className="text-xs text-text-tertiary">Country</span><p className="text-sm">{selected.country}</p></div>
            </div>

            {/* Collapsible sections for mobile */}
            <details className="border-t border-border pt-4 group" open>
              <summary className="text-sm font-bold text-text-primary flex items-center gap-2 cursor-pointer list-none select-none min-h-[36px]">
                <Clock size={14} /> Timeline
                <ChevronDown size={14} className="ml-auto transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-3 mt-3">
                {[
                  { time: selected.createdAt, event: 'Order created', status: 'completed' },
                  { time: selected.createdAt, event: 'Payment verification', status: selected.status === 'pending' ? 'pending' : 'completed' },
                  { time: selected.createdAt, event: 'Merchant assignment', status: selected.assignedMerchant !== 'Unassigned' ? 'completed' : 'pending' },
                  { time: selected.createdAt, event: 'Fulfillment', status: selected.status === 'completed' ? 'completed' : selected.status === 'failed' ? 'failed' : 'pending' },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      step.status === 'completed' ? 'bg-usdt-green' :
                      step.status === 'failed' ? 'bg-error-red' : 'bg-text-tertiary'
                    }`} />
                    <div>
                      <p className="text-sm text-text-primary">{step.event}</p>
                      <p className="text-xs text-text-tertiary">{step.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </details>

            <details className="border-t border-border pt-4 group">
              <summary className="text-sm font-bold text-text-primary flex items-center gap-2 cursor-pointer list-none select-none min-h-[36px]">
                <ShieldAlert size={14} /> Risk Details
                <ChevronDown size={14} className="ml-auto transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-text-tertiary">Risk Score</span><span className={`font-semibold ${riskColor(selected.riskScore)}`}>{selected.riskScore}%</span></div>
                <div className="flex justify-between text-sm"><span className="text-text-tertiary">Country</span><span>{selected.country}</span></div>
                <div className="flex justify-between text-sm"><span className="text-text-tertiary">Payment Method</span><span className="capitalize">{selected.paymentMethod.replace('_', ' ')}</span></div>
              </div>
            </details>

            <details className="border-t border-border pt-4 group">
              <summary className="text-sm font-bold text-text-primary flex items-center gap-2 cursor-pointer list-none select-none min-h-[36px]">
                <MoreHorizontal size={14} /> Actions
                <ChevronDown size={14} className="ml-auto transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Process', 'Complete', 'Escalate', 'View History', 'Add Note', 'Refund'].map((action) => (
                  <button key={action} className="px-4 py-2.5 rounded-lg bg-control-bg hover:bg-white/10 transition-colors text-sm text-text-secondary hover:text-text-primary min-h-[36px]">
                    {action}
                  </button>
                ))}
              </div>
            </details>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};
