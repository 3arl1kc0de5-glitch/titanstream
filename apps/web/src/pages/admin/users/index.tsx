import type React from 'react';
import { useState, useEffect } from 'react';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import { MetricCard, MetricCardGrid } from '@/components/admin/MetricCard';
import { api } from '@/services/api';
import { useWalletStore } from '@/store/useWalletStore';

export interface UserProfile {
  id: string;
  telegramId: string;
  name: string;
  username: string;
  totalVolume: number;
  totalDeposits: number;
  totalWithdrawals: number;
  riskScore: number;
  flags: string[];
  wallets: string[];
}

const riskColor = (score: number) => {
  if (score >= 70) return 'text-error-red';
  if (score >= 40) return 'text-gold';
  return 'text-usdt-green';
};

const columns: Column<UserProfile>[] = [
  { key: 'name', label: 'Name', sortable: true, width: 'w-[150px]',
    render: (u) => <><div className="font-semibold">{u.name}</div><div className="text-xs text-text-tertiary">{u.username}</div></>,
    mobile: (u) => ({ label: 'Name', value: <><span className="font-semibold">{u.name}</span><span className="text-text-tertiary text-xs block">{u.username}</span></> }) },
  { key: 'telegramId', label: 'Telegram ID', sortable: true, width: 'w-[110px]',
    render: (u) => <span className="font-mono text-xs">{u.telegramId}</span> },
  { key: 'totalVolume', label: 'Volume', sortable: true, width: 'w-[120px]',
    render: (u) => <span className="font-semibold">${(Number(u.totalVolume) || 0).toLocaleString()}</span>,
    mobile: (u) => ({ label: 'Volume', value: <span className="font-semibold">${(Number(u.totalVolume) || 0).toLocaleString()}</span> }) },
  { key: 'riskScore', label: 'Risk', sortable: true, width: 'w-[70px]',
    render: (u) => <span className={`font-semibold ${riskColor(u.riskScore)}`}>{u.riskScore}</span>,
    mobile: (u) => ({ label: 'Risk', value: <span className={`font-semibold ${riskColor(u.riskScore)}`}>{u.riskScore}</span> }) },
];

export const UsersPage: React.FC = () => {
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/users/list')
      .then((res) => setUsersList(res.data?.data || []))
      .catch(() => setUsersList([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <MetricCardGrid columns={2}>
        <MetricCard label="Total Registered Users" value={usersList.length.toString()} change={0} icon="Users" variant="green" />
        <MetricCard label="Flagged Accounts" value={usersList.filter(u => u.flags?.length > 0).length.toString()} change={0} icon="ShieldAlert" variant="gold" />
      </MetricCardGrid>

      {loading ? (
        <div className="p-8 text-center bg-card-bg rounded-xl border border-white/5 text-xs text-text-tertiary">
          Loading user directory...
        </div>
      ) : usersList.length === 0 ? (
        <div className="p-8 text-center bg-card-bg rounded-xl border border-white/5 space-y-1">
          <p className="text-xs font-bold text-text-primary">No user accounts registered yet</p>
          <p className="text-[11px] text-text-tertiary">Authenticated Telegram members will appear here automatically.</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={usersList}
          keyExtractor={(u) => u.id}
          onRowClick={(u) => setSelected(u)}
          searchable
          searchPlaceholder="Search by name, Telegram ID, username..."
          pageSize={10}
          mobileCard
        />
      )}

      {selected && (
        <DetailDrawer isOpen={!!selected} onClose={() => setSelected(null)} title={selected.name || 'User Details'}>
          <div className="space-y-5">
            <div>
              <p className="text-sm text-text-tertiary">{selected.username}</p>
              <p className="text-xs font-mono text-text-tertiary">Telegram ID: {selected.telegramId}</p>
            </div>
            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="text-sm font-bold text-text-primary">Admin Wallet Control</h4>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Amount USDT"
                  id="accredit-amount-input"
                  className="bg-control-bg text-text-primary rounded-xl px-3 py-2 text-sm border border-white/10 focus:border-usdt-green focus:outline-none flex-1 font-mono font-bold"
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('accredit-amount-input') as HTMLInputElement;
                    const amt = parseFloat(input.value);
                    if (!amt || isNaN(amt)) return;
                    useWalletStore.getState().accreditUserBalance(amt, `Admin accreditation for user ${selected.telegramId}`);
                    alert(`Accredited $${amt} USDT to balance.`);
                    input.value = '';
                  }}
                  className="px-4 py-2 rounded-xl bg-usdt-green text-app-bg text-xs font-bold shadow-md"
                >
                  Accredit Balance
                </button>
              </div>
            </div>
          </div>
        </DetailDrawer>
      )}
    </div>
  );
};
