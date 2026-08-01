import type React from 'react';
import { useState, useEffect } from 'react';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { MetricCard, MetricCardGrid } from '@/components/admin/MetricCard';
import { useSettingsStore } from '@/store/useSettingsStore';
import { paymentOrderService, type PaymentDestinationConfig } from '@/services/paymentOrderService';

export const PaymentRailsPage: React.FC = () => {
  const { adminPhoneNumbers, activeAdminPhone, setActiveAdminPhone, addAdminPhoneNumber, removeAdminPhoneNumber } = useSettingsStore();
  const [newPhone, setNewPhone] = useState('');
  const [rails, setRails] = useState<PaymentDestinationConfig[]>([]);

  useEffect(() => {
    paymentOrderService
      .getDestinations()
      .then((data) => setRails(data || []))
      .catch(() => setRails([]));
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPhone.trim()) {
      addAdminPhoneNumber(newPhone.trim());
      setNewPhone('');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <MetricCardGrid columns={2}>
        <MetricCard label="Active Payment Rails" value={rails.filter(r => r.isActive).length.toString()} icon="CreditCard" variant="green" />
        <MetricCard label="Destinations Loaded" value={`${rails.length} Channels`} icon="DollarSign" variant="blue" />
      </MetricCardGrid>

      {/* Admin Phone Numbers Configuration Card */}
      <div className="bg-card-bg rounded-xl p-4 border border-usdt-green/30 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <span>Admin Payment Receiving Numbers</span>
              <span className="text-[10px] font-mono font-bold bg-usdt-green/20 text-usdt-green px-2 py-0.5 rounded border border-usdt-green/30">
                USSD: *165*1*1*(Phone)*(Amount)#
              </span>
            </h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              These phone numbers receive mobile money deposits. Selected active number is invoked when users tap "Send payment push prompt".
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
          {adminPhoneNumbers.map((phone) => (
            <div
              key={phone}
              className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                activeAdminPhone === phone
                  ? 'bg-usdt-green/15 border-usdt-green text-usdt-green shadow-sm'
                  : 'bg-control-bg border-white/10 text-text-secondary'
              }`}
            >
              <div className="font-mono font-bold text-xs">
                {phone}
                {activeAdminPhone === phone && (
                  <span className="ml-2 text-[9px] bg-usdt-green text-app-bg font-extrabold px-1.5 py-0.5 rounded-full uppercase">
                    Active
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {activeAdminPhone !== phone && (
                  <button
                    onClick={() => setActiveAdminPhone(phone)}
                    className="text-[10px] font-bold px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-text-primary"
                  >
                    Select
                  </button>
                )}
                {adminPhoneNumbers.length > 1 && (
                  <button
                    onClick={() => removeAdminPhoneNumber(phone)}
                    className="text-[10px] font-bold px-1.5 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleAdd} className="flex items-center gap-2 pt-2 border-t border-border/40">
          <input
            type="text"
            placeholder="Add new admin receiving phone number (e.g. 0779998877)"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            className="bg-control-bg text-text-primary rounded-xl px-3 py-2 text-xs font-mono border border-white/10 focus:border-usdt-green focus:outline-none flex-1"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-usdt-green text-app-bg font-extrabold text-xs shadow-md hover:brightness-110 press-feedback"
          >
            Add Phone Number
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {rails.map((rail) => (
          <div key={rail.id} className="bg-card-bg rounded-xl p-3 sm:p-4 border border-border/50 active:scale-[0.99] transition-transform">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${rail.isActive ? 'bg-usdt-green' : 'bg-error-red'}`} />
                <span className="text-sm font-bold text-text-primary">{rail.network} ({rail.country})</span>
              </div>
              <StatusBadge label={rail.isActive ? 'active' : 'disabled'} variant={rail.isActive ? 'success' : 'danger'} dot />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm">
              <div><span className="text-text-tertiary text-xs">Currency</span><div className="text-text-primary font-semibold">{rail.currency}</div></div>
              <div><span className="text-text-tertiary text-xs">USDT Rate</span><div className="text-text-primary font-semibold">{rail.exchangeRateUsdt}</div></div>
              <div><span className="text-text-tertiary text-xs">Receiving No.</span><div className="text-text-primary font-mono text-xs">{rail.receivingNumber}</div></div>
              <div><span className="text-text-tertiary text-xs">Recipient</span><div className="text-text-primary font-semibold">{rail.receivingName}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
