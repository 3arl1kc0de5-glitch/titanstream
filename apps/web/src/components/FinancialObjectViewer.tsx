import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  ArrowRight,
  ShieldCheck,
  Server,
  UserCheck,
  Headphones,
  BellRing
} from 'lucide-react';

export type FinancialObjectType = 
  | 'settlement' 
  | 'withdrawal' 
  | 'machine' 
  | 'referral' 
  | 'notification' 
  | 'support';

interface Step {
  label: string;
  description: string;
  statuses: string[];
}

interface FinancialObjectViewerProps {
  type: FinancialObjectType;
  currentStatus: string;
  createdAt?: string;
  completedAt?: string;
  errorMessage?: string;
  referenceCode?: string;
  additionalDetails?: Record<string, string>;
}

const LIFECYCLES: Record<FinancialObjectType, Step[]> = {
  settlement: [
    { label: 'Invoice Generated', description: 'Settlement record initialized', statuses: ['CREATED', 'INITIALIZED'] },
    { label: 'Awaiting Payment', description: 'Waiting for merchant or bot payment', statuses: ['WAITING_FOR_PAYMENT', 'WAITING_PAYMENT', 'OPERATOR_ASSIGNED', 'MERCHANT_ASSIGNED'] },
    { label: 'Verifying', description: 'Verifying deposit or webhook signature', statuses: ['VERIFYING', 'PAYMENT_RECEIVED'] },
    { label: 'Approved', description: 'Operation signed by orchestrator', statuses: ['APPROVED', 'POSTED', 'USDT_SENT'] },
    { label: 'Settle Completed', description: 'USDT credited to double-entry ledger', statuses: ['COMPLETED'] },
  ],
  withdrawal: [
    { label: 'Request Received', description: 'Withdrawal record created', statuses: ['CREATED', 'PENDING'] },
    { label: 'Risk Analysis', description: 'Universal check & velocity analysis', statuses: ['RISK_CHECK', 'PENDING_APPROVAL'] },
    { label: 'Provider Execution', description: 'Transferring to destination route', statuses: ['PROCESSING'] },
    { label: 'Payout Completed', description: 'Ledger finalized successfully', statuses: ['COMPLETED'] },
  ],
  machine: [
    { label: 'Capacity Ordered', description: 'New Machine tier requested', statuses: ['CREATED', 'PENDING'] },
    { label: 'Price Locked', description: 'USDT deducted, reserving node config', statuses: ['APPROVED', 'RESERVED'] },
    { label: 'Node Active', description: 'Compute capacity online', statuses: ['ACTIVE', 'PAID'] },
    { label: 'Daily Loop Completed', description: 'First yield cycle complete', statuses: ['COMPLETED'] },
  ],
  referral: [
    { label: 'Link Created', description: 'Referral tracking link live', statuses: ['CREATED'] },
    { label: 'Auth Completed', description: 'Telegram identity verified', statuses: ['REGISTERED', 'AUTHENTICATED'] },
    { label: 'Bonus Applied', description: 'Compute capacity boost unlocked', statuses: ['ACTIVE', 'COMPLETED'] },
  ],
  support: [
    { label: 'Ticket Received', description: 'Ticket created by user', statuses: ['CREATED', 'Waiting for Admin'] },
    { label: 'Operator Assigned', description: 'Admin reviewing issue details', statuses: ['ASSIGNED', 'Processing'] },
    { label: 'Resolved', description: 'Reply delivered to Telegram Bot', statuses: ['RESOLVED', 'Completed'] },
  ],
  notification: [
    { label: 'Event Triggered', description: 'Financial or system alert ready', statuses: ['TRIGGERED', 'CREATED'] },
    { label: 'Notification Sent', description: 'Alert delivered to client app', statuses: ['SENT', 'READ'] },
  ],
};

const TYPE_ICONS: Record<FinancialObjectType, React.ReactNode> = {
  settlement: <ShieldCheck className="text-usdt-green" size={20} />,
  withdrawal: <ArrowRight className="text-error-red" size={20} />,
  machine: <Server className="text-sky-400" size={20} />,
  referral: <UserCheck className="text-gold" size={20} />,
  support: <Headphones className="text-cyan-400" size={20} />,
  notification: <BellRing className="text-pink-400" size={20} />,
};

export const FinancialObjectViewer: React.FC<FinancialObjectViewerProps> = ({
  type,
  currentStatus,
  createdAt,
  completedAt,
  errorMessage,
  referenceCode,
  additionalDetails = {},
}) => {
  const steps = LIFECYCLES[type] || [];
  const statusUpper = currentStatus.toUpperCase();
  
  // Find current step index
  let currentStepIndex = -1;
  const isTerminalFailure = ['FAILED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'DISPUTED'].includes(statusUpper);

  if (!isTerminalFailure) {
    currentStepIndex = steps.findIndex((step) => step.statuses.some((s) => s.toUpperCase() === statusUpper));
    // If not found directly, default to last completed check
    if (currentStepIndex === -1 && statusUpper === 'COMPLETED') {
      currentStepIndex = steps.length - 1;
    }
  }

  return (
    <div className="glass-panel p-5 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden bg-control-bg/10">
      {/* Glow Header */}
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />

      {/* Header Summary */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
            {TYPE_ICONS[type]}
          </div>
          <div>
            <h4 className="text-xs font-black uppercase text-text-primary tracking-wider">
              {type} Lifecycle
            </h4>
            {referenceCode && (
              <p className="text-[10px] text-text-tertiary font-mono mt-0.5">Ref: {referenceCode}</p>
            )}
          </div>
        </div>

        <div className="text-right">
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border uppercase tracking-wider ${
            isTerminalFailure 
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
              : currentStatus === 'COMPLETED' || currentStatus === 'Completed'
              ? 'bg-usdt-green/10 text-usdt-green border-usdt-green/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            {currentStatus}
          </span>
        </div>
      </div>

      {/* Steps Timeline Visualizer */}
      <div className="relative pl-7 space-y-5">
        {/* Glowing vertical connector line */}
        <div className="absolute left-2.5 top-2 bottom-2 w-[1px] bg-white/10" />

        {steps.map((step, idx) => {
          const isCompleted = currentStepIndex > idx || (currentStatus === 'COMPLETED' && idx === steps.length - 1);
          const isActive = currentStepIndex === idx && !isTerminalFailure;
          const isFuture = currentStepIndex < idx && !isCompleted;

          return (
            <div key={step.label} className="relative">
              {/* Step indicator node */}
              <div className="absolute -left-7.5 top-0.5 flex items-center justify-center w-5 h-5 rounded-full z-10">
                {isCompleted ? (
                  <div className="bg-[#06070b] rounded-full p-0.5 border border-usdt-green">
                    <CheckCircle2 size={13} className="text-usdt-green" />
                  </div>
                ) : isActive ? (
                  <div className="bg-[#06070b] rounded-full p-0.5 border border-amber-400 relative">
                    <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
                    <Clock size={13} className="text-amber-400" />
                  </div>
                ) : (
                  <div className="bg-[#06070b] rounded-full p-0.5 border border-white/20">
                    <Circle size={13} className="text-text-tertiary" />
                  </div>
                )}
              </div>

              {/* Step Content */}
              <div>
                <h5 className={`text-xs font-bold leading-none ${
                  isCompleted ? 'text-text-primary' : isActive ? 'text-amber-400' : 'text-text-tertiary'
                }`}>
                  {step.label}
                </h5>
                <p className="text-[10px] text-text-tertiary mt-1 leading-normal">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}

        {/* Failure state display */}
        {isTerminalFailure && (
          <div className="relative bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 flex gap-2.5 items-start mt-4 animate-shake">
            <XCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
            <div className="text-[10px] font-sans font-medium text-rose-300">
              <span className="font-extrabold uppercase block text-rose-400">Operation Terminated</span>
              <p className="mt-0.5">{errorMessage || 'The process was cancelled or failed verification.'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Meta Dates & Details */}
      {(createdAt || completedAt || Object.keys(additionalDetails).length > 0) && (
        <div className="mt-5 pt-3.5 border-t border-white/5 grid grid-cols-2 gap-2 text-[10px] text-text-tertiary font-mono">
          {createdAt && (
            <div>
              <span className="text-text-quaternary block uppercase tracking-wider">Created At</span>
              <span className="text-text-secondary mt-0.5 block">{new Date(createdAt).toLocaleString()}</span>
            </div>
          )}
          {completedAt && (
            <div>
              <span className="text-text-quaternary block uppercase tracking-wider">Completed At</span>
              <span className="text-text-secondary mt-0.5 block">{new Date(completedAt).toLocaleString()}</span>
            </div>
          )}

          {Object.entries(additionalDetails).map(([key, val]) => (
            <div key={key}>
              <span className="text-text-quaternary block uppercase tracking-wider">{key}</span>
              <span className="text-text-secondary mt-0.5 block truncate" title={val}>{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
