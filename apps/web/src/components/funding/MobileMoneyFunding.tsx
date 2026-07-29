import React, { useState } from 'react';
import { Smartphone, ArrowRight, ShieldAlert, Zap, AlertCircle, PhoneCall, Copy, Check, Clock } from 'lucide-react';
import { useWalletStore } from '../../store/useWalletStore';
import { usePaymentOrderStore } from '../../store/usePaymentOrderStore';
import { paymentOrderService, type PaymentOrderRecord } from '../../services/paymentOrderService';
import { useTelegram } from '../../context/TelegramContext';

interface MobileMoneyFundingProps {
  providerId?: string;
  onSuccess?: (order: PaymentOrderRecord) => void;
  onCancel?: () => void;
}

export const MobileMoneyFunding: React.FC<MobileMoneyFundingProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [usdtAmount, setUsdtAmount] = useState<string>('10');
  const [network, setNetwork] = useState<string>('MTN');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedUSSD, setCopiedUSSD] = useState(false);
  const [activeOrder, setActiveOrder] = useState<PaymentOrderRecord | null>(null);
  const [verificationSubmitted, setVerificationSubmitted] = useState(false);

  const { fetchBalanceFromEngine, fetchTransactions } = useWalletStore();
  const { hapticFeedback } = useTelegram();

  const numericAmount = parseFloat(usdtAmount) || 0;

  const handleQuickSelect = (val: number) => {
    hapticFeedback.selectionChanged();
    setUsdtAmount(val.toString());
  };

  const handleCopyUSSD = (code: string) => {
    navigator.clipboard.writeText(code);
    hapticFeedback.notificationOccurred('success');
    setCopiedUSSD(true);
    setTimeout(() => setCopiedUSSD(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount < 1) {
      setErrorMessage('Minimum deposit amount is 1 USDT');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    hapticFeedback.impactOccurred('medium');

    try {
      const order = await paymentOrderService.createOrder({
        type: 'DEPOSIT',
        amount: numericAmount,
        currency: 'USDT',
        paymentMethod: 'MOBILE_MONEY',
        network,
        country: 'UG',
      });

      setActiveOrder(order);
      if (onSuccess) onSuccess(order);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Failed to initialize payment order';
      setErrorMessage(message);
      hapticFeedback.notificationOccurred('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!activeOrder) return;
    setIsSubmitting(true);
    try {
      const updated = await paymentOrderService.submitForVerification(activeOrder.id);
      setActiveOrder(updated);
      setVerificationSubmitted(true);
      hapticFeedback.notificationOccurred('success');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit verification');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (activeOrder) {
    return (
      <div className="space-y-4">
        {/* Payment Order Summary */}
        <div className="glass-panel p-4 rounded-2xl border border-usdt-green/30 bg-usdt-green/10 space-y-3 text-center">
          <div className="flex items-center justify-center gap-2 text-usdt-green text-xs font-black uppercase">
            <Clock size={16} /> Order Reference: {activeOrder.reference}
          </div>
          <div className="text-3xl font-extrabold font-mono text-text-primary">
            ${activeOrder.amount.toFixed(2)} USDT
          </div>
          <div className="text-xs font-mono font-bold text-text-secondary">
            Payable: <span className="text-usdt-green">{activeOrder.localAmount.toLocaleString()} {activeOrder.currency}</span>
          </div>
        </div>

        {/* Dynamic USSD Launcher */}
        <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-text-secondary">
            <span>Receiving Name: <strong>{activeOrder.receivingName}</strong></span>
            <span>Network: <strong>{activeOrder.network}</strong></span>
          </div>

          <div className="bg-control-bg p-3 rounded-xl border border-white/10 flex items-center justify-between font-mono text-xs text-usdt-green font-bold">
            <span className="truncate mr-2">{activeOrder.ussdCode}</span>
            <button
              type="button"
              onClick={() => handleCopyUSSD(activeOrder.ussdCode)}
              className="press-feedback p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-text-primary shrink-0"
              title="Copy USSD Code"
            >
              {copiedUSSD ? <Check size={14} className="text-usdt-green" /> : <Copy size={14} />}
            </button>
          </div>

          {/* Auto-Dial Tel Launcher Button */}
          <a
            href={activeOrder.telUri}
            onClick={() => hapticFeedback.impactOccurred('heavy')}
            className="press-feedback w-full py-3 rounded-xl bg-usdt-green text-app-bg font-extrabold text-xs flex items-center justify-center gap-2 shadow-md hover:brightness-110 no-underline"
          >
            <PhoneCall size={16} /> <span>📞 Open Mobile Money (*165*1*1*)</span>
          </a>
        </div>

        {/* Simple Step Instructions */}
        <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5 text-xs text-text-secondary">
          <div className="font-extrabold text-text-primary text-xs uppercase mb-1">Payment Instructions</div>
          <ol className="list-decimal list-inside space-y-1 text-[11px] font-medium">
            <li>Tap <strong>Open Mobile Money</strong> above to open your phone dialer.</li>
            <li>Confirm the payment details and enter your Mobile Money PIN.</li>
            <li>Once completed, tap <strong>I Have Sent Payment</strong> below.</li>
            <li>Our Treasury Operator will verify the transfer and credit your wallet.</li>
          </ol>
        </div>

        {verificationSubmitted ? (
          <div className="p-3.5 rounded-xl bg-usdt-green/15 border border-usdt-green/30 text-usdt-green text-xs font-bold text-center">
            🟢 Payment submitted for verification! Your balance will update automatically upon operator approval.
          </div>
        ) : (
          <button
            type="button"
            onClick={handleVerify}
            disabled={isSubmitting}
            className="press-feedback w-full py-3.5 rounded-xl bg-usdt-green text-app-bg font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg"
          >
            {isSubmitting ? 'Submitting...' : 'I Have Sent Payment'}
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header Info */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-usdt-green/20 text-usdt-green flex items-center justify-center font-bold">
          <Smartphone size={20} />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-text-primary">Mobile Money Deposit Order</h3>
          <p className="text-xs text-text-tertiary">Fund USDT instantly via USSD push launcher or Mobile Money</p>
        </div>
      </div>

      {/* Network Selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-text-tertiary">Select Operator Network</label>
        <div className="grid grid-cols-2 gap-2">
          {['MTN', 'AIRTEL'].map((net) => (
            <button
              key={net}
              type="button"
              onClick={() => {
                hapticFeedback.selectionChanged();
                setNetwork(net);
              }}
              className={`press-feedback py-2.5 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-between transition-colors ${
                network === net
                  ? 'bg-usdt-green/15 border-usdt-green text-usdt-green shadow-sm'
                  : 'bg-control-bg/60 border-white/10 text-text-secondary hover:text-text-primary'
              }`}
            >
              <span>{net === 'MTN' ? 'MTN Mobile Money' : 'Airtel Money'}</span>
              {network === net && <Zap size={14} className="fill-usdt-green" />}
            </button>
          ))}
        </div>
      </div>

      {/* Amount Input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-text-tertiary">Amount to Deposit</label>
          <span className="text-[11px] font-semibold text-text-tertiary">Min: 1 USDT</span>
        </div>

        <div className="relative flex items-center">
          <input
            type="number"
            min="1"
            max="10000"
            step="any"
            value={usdtAmount}
            onChange={(e) => setUsdtAmount(e.target.value)}
            placeholder="10"
            className="w-full h-12 pl-4 pr-16 bg-control-bg border border-white/10 rounded-xl text-lg font-mono font-extrabold text-text-primary focus:outline-none focus:border-usdt-green transition-colors"
          />
          <span className="absolute right-4 font-mono font-bold text-xs text-usdt-green bg-usdt-green/10 px-2 py-1 rounded">
            USDT
          </span>
        </div>

        {/* Quick Amount Chips */}
        <div className="flex items-center gap-2 pt-1">
          {[5, 10, 25, 50, 100].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handleQuickSelect(val)}
              className="press-feedback flex-1 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-mono font-bold text-text-secondary hover:text-text-primary"
            >
              ${val}
            </button>
          ))}
        </div>
      </div>

      {/* Error display */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || numericAmount < 1}
        className="press-feedback w-full py-3.5 rounded-xl bg-usdt-green text-app-bg font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-usdt-green/20 disabled:opacity-50"
      >
        {isSubmitting ? (
          <span>Generating USSD Order...</span>
        ) : (
          <>
            <span>Generate USSD Deposit Order</span>
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
};
