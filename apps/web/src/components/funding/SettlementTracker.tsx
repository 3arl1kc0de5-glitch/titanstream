import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  PhoneCall,
} from 'lucide-react';
import { type SettlementSessionView, settlementService } from '../../services/settlementService';
import { useWalletStore } from '../../store/useWalletStore';
import { useTelegram } from '../../context/TelegramContext';
import { FinancialObjectViewer } from '../FinancialObjectViewer';

interface SettlementTrackerProps {
  session: SettlementSessionView;
  onClose?: () => void;
  onRetry?: () => void;
}

const STEP_PROGRESS: Record<string, number> = {
  CREATED: 1,
  INITIALIZED: 1,
  OPERATOR_ASSIGNED: 2,
  MERCHANT_ASSIGNED: 2,
  WAITING_FOR_PAYMENT: 2,
  WAITING_PAYMENT: 2,
  VERIFYING: 3,
  PAYMENT_RECEIVED: 3,
  APPROVED: 4,
  USDT_SENT: 4,
  POSTED: 4,
  COMPLETED: 5,
};

const TERMINAL_FAILURE_SET = new Set(['FAILED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'DISPUTED']);

export const SettlementTracker: React.FC<SettlementTrackerProps> = ({
  session: initialSession,
  onClose,
  onRetry,
}) => {
  const [session, setSession] = useState<SettlementSessionView>(initialSession);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (initialSession.expiresAt) {
      const remaining = Math.floor((new Date(initialSession.expiresAt).getTime() - Date.now()) / 1000);
      return Math.max(0, remaining);
    }
    return 900; // 15 minutes default
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { pollActiveSession, cancelSession, fetchBalanceFromEngine } = useWalletStore();
  const { hapticFeedback } = useTelegram();

  // Polling loop every 3 seconds for active sessions
  useEffect(() => {
    setSession(initialSession);
  }, [initialSession]);

  useEffect(() => {
    if (TERMINAL_FAILURE_SET.has(session.status) || session.status === 'COMPLETED') {
      return;
    }

    const interval = setInterval(async () => {
      const updated = await pollActiveSession(session.settlementId);
      if (updated) {
        setSession(updated);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [session.settlementId, session.status, pollActiveSession]);

  // Countdown timer interval
  useEffect(() => {
    if (TERMINAL_FAILURE_SET.has(session.status) || session.status === 'COMPLETED') {
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setSession((s) => ({ ...s, status: 'EXPIRED' }));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session.status]);

  const handleManualRefresh = async () => {
    hapticFeedback.impactOccurred('light');
    setIsRefreshing(true);
    const updated = await pollActiveSession(session.settlementId);
    if (updated) {
      setSession(updated);
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    hapticFeedback.notificationOccurred('success');
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCancel = async () => {
    hapticFeedback.impactOccurred('medium');
    await cancelSession(session.settlementId);
    setSession((s) => ({ ...s, status: 'CANCELLED' }));
  };

  const currentStep = STEP_PROGRESS[session.status] || 1;
  const isFailed = TERMINAL_FAILURE_SET.has(session.status);
  const isCompleted = session.status === 'COMPLETED';

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const referenceText = session.referenceCode || session.reference || session.settlementId.slice(-8).toUpperCase();
  const requestedAmountText = session.requestedAmount || session.amount || '0.00';
  const expectedCryptoText = session.expectedCryptoAmount || session.expectedAssetAmount || '0.00';

  return (
    <div className="w-full space-y-4">
      {/* Header card with status badge & countdown */}
      <div className="glass-panel p-4 rounded-2xl relative overflow-hidden border border-white/10 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-usdt-green animate-pulse" />
            <span className="text-xs font-mono font-bold text-text-tertiary uppercase tracking-wider">
              {session.provider.replace('_', ' ')}
            </span>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="press-feedback flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-text-secondary hover:text-text-primary"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Amount & Status headline */}
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <span className="text-2xl font-extrabold text-text-primary tracking-tight font-mono">
              +{expectedCryptoText} USDT
            </span>
            <div className="text-xs text-text-secondary mt-0.5">
              Requested: <span className="font-semibold text-text-primary">{requestedAmountText}</span> ({session.asset || 'USDT'})
            </div>
          </div>

          {/* Status pill */}
          <div
            className={`px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5 shadow-sm ${
              isCompleted
                ? 'bg-usdt-green/20 text-usdt-green border border-usdt-green/30'
                : isFailed
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 size={13} />
                <span>Completed</span>
              </>
            ) : isFailed ? (
              <>
                <XCircle size={13} />
                <span>{session.status}</span>
              </>
            ) : (
              <>
                <Clock size={13} className="animate-spin" />
                <span>{session.status.replace(/_/g, ' ')}</span>
              </>
            )}
          </div>
        </div>

        {/* Countdown Timer bar if active */}
        {!isCompleted && !isFailed && (
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-text-secondary font-medium">Session Expires In:</span>
            <span className={`font-mono font-bold px-2 py-0.5 rounded ${secondsRemaining < 120 ? 'text-rose-400 bg-rose-500/10' : 'text-amber-300 bg-amber-500/10'}`}>
              {formatTimer(secondsRemaining)}
            </span>
          </div>
        )}
      </div>

      {/* Visual Object Viewer Lifecycle stepper */}
      <FinancialObjectViewer
        type="settlement"
        currentStatus={session.status}
        createdAt={session.createdAt}
        errorMessage={isFailed ? `Settlement terminated with status: ${session.status}` : undefined}
        referenceCode={session.referenceCode || session.reference || session.settlementId}
        additionalDetails={{
          'Provider': session.provider,
          'Amount': `${expectedCryptoText} USDT`,
        }}
      />

      {/* Payment details / Instructions for Active Session */}
      {!isCompleted && !isFailed && (
        <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3 bg-usdt-green/5">
          <div className="flex items-center gap-2 text-usdt-green font-bold text-xs">
            <ShieldCheck size={16} />
            <span>TetherStream Verified Payment Route</span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Reference Code field */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-control-bg/80 border border-white/10">
              <div>
                <div className="text-[10px] font-bold text-text-tertiary uppercase">Payment Reference</div>
                <div className="font-mono font-extrabold text-text-primary text-sm tracking-wider">{referenceText}</div>
              </div>
              <button
                onClick={() => handleCopy(referenceText, 'reference')}
                className="press-feedback p-2 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary"
              >
                {copiedField === 'reference' ? <Check size={14} className="text-usdt-green" /> : <Copy size={14} />}
              </button>
            </div>

            {/* Merchant Mobile Money Destination & USSD Push if provided */}
            {session.mobileMoneyNumber && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-control-bg/80 border border-white/10">
                  <div>
                    <div className="text-[10px] font-bold text-text-tertiary uppercase">Admin Payment Phone Number</div>
                    <div className="font-mono font-extrabold text-usdt-green text-sm tracking-wider">{session.mobileMoneyNumber}</div>
                  </div>
                  <button
                    onClick={() => handleCopy(session.mobileMoneyNumber!, 'destination')}
                    className="press-feedback p-2 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary"
                  >
                    {copiedField === 'destination' ? <Check size={14} className="text-usdt-green" /> : <Copy size={14} />}
                  </button>
                </div>

                <button
                  onClick={() => {
                    const ussdStr = `*165*1*1*${session.mobileMoneyNumber}*${Math.round(Number(session.requestedAmount || 10))}#`;
                    window.location.href = `tel:*165*1*1*${session.mobileMoneyNumber}*${Math.round(Number(session.requestedAmount || 10))}%23`;
                  }}
                  className="press-feedback w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-usdt-green text-app-bg font-extrabold text-xs shadow-md"
                >
                  <PhoneCall size={14} />
                  <span>Invoke Phone USSD Push (*165*1*1*)</span>
                </button>
              </div>
            )}

            {/* CryptoBot direct link if available */}
            {session.paymentUrl && (
              <a
                href={session.paymentUrl}
                target="_blank"
                rel="noreferrer"
                className="press-feedback w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-usdt-green text-app-bg font-extrabold text-xs shadow-md"
              >
                <span>Pay via CryptoBot</span>
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Failure State & Recovery Actions */}
      {isFailed && (
        <div className="glass-panel p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
            <AlertCircle size={16} />
            <span>Settlement Unsuccessful</span>
          </div>
          <p className="text-xs text-text-secondary">
            This settlement session ended with status <span className="font-mono font-bold text-rose-300">{session.status}</span>. Your balance remains unchanged.
          </p>

          <div className="flex items-center gap-2 pt-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="press-feedback flex-1 py-2.5 rounded-xl bg-usdt-green text-app-bg font-extrabold text-xs flex items-center justify-center gap-1.5"
              >
                <span>New Request</span>
                <ArrowRight size={14} />
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="press-feedback px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-text-secondary hover:text-text-primary font-bold text-xs"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}

      {/* Completion CTA */}
      {isCompleted && (
        <div className="glass-panel p-4 rounded-2xl border border-usdt-green/30 bg-usdt-green/10 space-y-3 text-center">
          <div className="w-10 h-10 rounded-full bg-usdt-green/20 text-usdt-green flex items-center justify-center mx-auto">
            <CheckCircle2 size={24} />
          </div>
          <h4 className="text-sm font-extrabold text-text-primary">USDT Successfully Credited!</h4>
          <p className="text-xs text-text-secondary">
            The Financial Orchestrator and Ledger have processed your deposit. Your balance is updated.
          </p>
          {onClose && (
            <button
              onClick={() => {
                fetchBalanceFromEngine();
                onClose();
              }}
              className="press-feedback w-full py-2.5 rounded-xl bg-usdt-green text-app-bg font-extrabold text-xs shadow-md"
            >
              Done
            </button>
          )}
        </div>
      )}

      {/* Cancel Action for active session */}
      {!isCompleted && !isFailed && (
        <button
          onClick={handleCancel}
          className="press-feedback w-full py-2.5 rounded-xl bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 text-text-tertiary hover:text-rose-400 font-bold text-xs transition-colors"
        >
          Cancel Settlement Session
        </button>
      )}
    </div>
  );
};
