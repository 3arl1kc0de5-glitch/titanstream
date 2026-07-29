import type React from 'react';
import { useState } from 'react';
import { userProfiles, type UserProfile } from '@/data/mock/users';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import { MetricCard, MetricCardGrid } from '@/components/admin/MetricCard';
import { ChevronDown, ShieldAlert, Users } from 'lucide-react';
import { useWalletStore } from '@/store/useWalletStore';
import { FinancialObjectViewer } from '@/components/FinancialObjectViewer';

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
    render: (u) => <span className="font-semibold">${u.totalVolume.toLocaleString()}</span>,
    mobile: (u) => ({ label: 'Volume', value: <span className="font-semibold">${u.totalVolume.toLocaleString()}</span> }) },
  { key: 'totalDeposits', label: 'Deposits', sortable: true, width: 'w-[100px]',
    render: (u) => <span>${u.totalDeposits.toLocaleString()}</span> },
  { key: 'totalWithdrawals', label: 'Withdrawals', sortable: true, width: 'w-[110px]',
    render: (u) => <span>${u.totalWithdrawals.toLocaleString()}</span> },
  { key: 'riskScore', label: 'Risk', sortable: true, width: 'w-[70px]',
    render: (u) => <span className={`font-semibold ${riskColor(u.riskScore)}`}>{u.riskScore}</span>,
    mobile: (u) => ({ label: 'Risk', value: <span className={`font-semibold ${riskColor(u.riskScore)}`}>{u.riskScore}</span> }) },
  { key: 'flags', label: 'Flags', width: 'w-[100px]',
    render: (u) => <span className="text-error-red text-xs">{u.flags.length > 0 ? `${u.flags.length} flag(s)` : '—'}</span> },
];

export const UsersPage: React.FC = () => {
  const [selected, setSelected] = useState<UserProfile | null>(null);

  return (
    <div className="space-y-4">
      <MetricCardGrid columns={2}>
        <MetricCard label="Total Users" value="12,458" change={3.2} icon="Users" variant="green" />
        <MetricCard label="Flagged" value={userProfiles.filter(u => u.flags.length > 0).length.toString()} change={0} icon="ShieldAlert" variant="gold" />
      </MetricCardGrid>

      <DataTable
        columns={columns}
        data={userProfiles as any}
        keyExtractor={(u: any) => u.id}
        onRowClick={(u: any) => setSelected(u as UserProfile)}
        searchable
        searchPlaceholder="Search by name, Telegram ID, username..."
        pageSize={10}
        mobileCard
      />

      <DetailDrawer isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''}>
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-tertiary">{selected.username}</p>
                <p className="text-xs font-mono text-text-tertiary">ID: {selected.telegramId}</p>
              </div>
              <span className={`text-lg font-bold ${riskColor(selected.riskScore)}`}>{selected.riskScore}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card-bg rounded-xl p-3"><span className="text-xs text-text-tertiary">Volume</span><div className="text-lg font-bold text-text-primary">${selected.totalVolume.toLocaleString()}</div></div>
              <div className="bg-card-bg rounded-xl p-3"><span className="text-xs text-text-tertiary">Risk</span><div className={`text-lg font-bold ${riskColor(selected.riskScore)}`}>{selected.riskScore}</div></div>
            </div>
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-bold text-text-primary mb-3">Details</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-text-tertiary text-xs">Countries</span><p className="text-text-primary">{selected.countries.join(', ')}</p></div>
                <div><span className="text-text-tertiary text-xs">Merchants</span><p className="text-text-primary">{(selected as any).linkedMerchants?.join(', ') || 'None'}</p></div>
                <div className="col-span-2"><span className="text-text-tertiary text-xs">Wallets</span><p className="text-text-primary font-mono text-xs break-all">{selected.wallets.join(', ')}</p></div>
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="text-sm font-bold text-text-primary flex items-center justify-between">
                <span>Admin Wallet Control & Accreditation</span>
                <span className="text-[10px] text-usdt-green bg-usdt-green/10 border border-usdt-green/30 px-2 py-0.5 rounded font-mono">
                  Numbers Controlled by Admin
                </span>
              </h4>
              <p className="text-xs text-text-tertiary">
                Directly accredit or adjust USDT wallet balance for this user profile.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Amount USDT (e.g. 50)"
                  id="accredit-amount-input"
                  className="bg-control-bg text-text-primary rounded-xl px-3 py-2 text-sm border border-white/10 focus:border-usdt-green focus:outline-none flex-1 font-mono font-bold"
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('accredit-amount-input') as HTMLInputElement;
                    const val = parseFloat(input?.value || '0');
                    if (val > 0) {
                      useWalletStore.getState().accreditUserBalance(val, `Admin Accreditation for ${selected.name}`);
                      alert(`Successfully accredited +${val} USDT to ${selected.name}'s wallet!`);
                      if (input) input.value = '';
                    } else {
                      alert('Please enter a valid positive USDT amount.');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-usdt-green text-app-bg font-extrabold text-xs shadow-md hover:brightness-110 press-feedback"
                >
                  Accredit Wallet
                </button>
              </div>
            </div>

            {selected.flags.length > 0 && (
              <details className="border-t border-border pt-4 group" open>
                <summary className="text-sm font-bold text-text-primary flex items-center gap-2 cursor-pointer list-none select-none min-h-[36px]">
                  <ShieldAlert size={14} /> Flags ({selected.flags.length})
                  <ChevronDown size={14} className="ml-auto transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-3 space-y-2">
                  {selected.flags.map((flag, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-error-red/10 text-error-red text-sm min-h-[36px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-error-red flex-shrink-0" />
                      {flag}
                    </div>
                  ))}
                </div>
              </details>
            )}

            <details className="border-t border-border pt-4 group">
              <summary className="text-sm font-bold text-text-primary flex items-center gap-2 cursor-pointer list-none select-none min-h-[36px]">
                <Users size={14} /> Referral Tree & Quality
                <ChevronDown size={14} className="ml-auto transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 space-y-2">
                <FinancialObjectViewer
                  type="referral"
                  currentStatus="active"
                  referenceCode={`REF-${selected.telegramId}`}
                  additionalDetails={{
                    'Total Invited': `${(selected as any).invitedCount || Math.floor(Math.random() * 8) + 1} users`,
                    'Qualified Refs': `${(selected as any).qualifiedCount || Math.floor(Math.random() * 4)} users`,
                    'Quality Score': `${(selected as any).qualityScore || 92}% (Low Fraud Risk)`,
                  }}
                />
              </div>
            </details>

            <details className="border-t border-border pt-4 group">
              <summary className="text-sm font-bold text-text-primary flex items-center gap-2 cursor-pointer list-none select-none min-h-[36px]">
                Notes
                <ChevronDown size={14} className="ml-auto transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-3 space-y-2">
                {selected.notes.map((note, i) => (
                  <div key={i} className="px-3 py-2.5 rounded-lg bg-control-bg text-sm text-text-secondary min-h-[36px]">
                    {note}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};
