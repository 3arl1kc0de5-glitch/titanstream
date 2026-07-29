import type React from 'react';
import { useState } from 'react';
import { CheckCircle2, Clock, ArrowDown, User, ShieldCheck, Zap, Wallet, Send, BarChart3, Lock } from 'lucide-react';

export interface OperationsTimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  module: 'Settlement' | 'Treasury' | 'Machine' | 'Referral' | 'Notification' | 'Analytics' | 'Audit';
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
  actor?: string;
}

interface OperationsTimelineProps {
  title?: string;
  events?: OperationsTimelineEvent[];
  mode?: 'platform' | 'user';
}

const DEFAULT_PLATFORM_EVENTS: OperationsTimelineEvent[] = [
  {
    id: 'evt-1',
    timestamp: '09:12:04',
    title: 'Settlement Approved',
    description: 'USSD Mobile Money Payment USh 370,000 ($100.00 USDT) confirmed by Merchant #01.',
    module: 'Settlement',
    status: 'COMPLETED',
    actor: 'Merchant #01',
  },
  {
    id: 'evt-2',
    timestamp: '09:12:05',
    title: 'Treasury Allocation Completed',
    description: '100.00 USDT routed: 80% Cloud Expansion Pool, 15% Liquidity Reserve, 5% Revenue Pool.',
    module: 'Treasury',
    status: 'COMPLETED',
    actor: 'Treasury Engine',
  },
  {
    id: 'evt-3',
    timestamp: '09:12:06',
    title: 'Machine Activated',
    description: 'Pro Processing Unit activated (+120 CU Compute Power allocated).',
    module: 'Machine',
    status: 'COMPLETED',
    actor: 'Machine Engine',
  },
  {
    id: 'evt-4',
    timestamp: '09:12:06',
    title: 'Referral Qualified',
    description: 'Referrer @kokello awarded +$5.00 USDT bonus & +2 Trust Score.',
    module: 'Referral',
    status: 'COMPLETED',
    actor: 'Referral Engine',
  },
  {
    id: 'evt-5',
    timestamp: '09:12:07',
    title: 'Telegram Notification Sent',
    description: 'In-app & Telegram Bot alert dispatched to user @kokello.',
    module: 'Notification',
    status: 'COMPLETED',
    actor: 'Communication Engine',
  },
  {
    id: 'evt-6',
    timestamp: '09:12:08',
    title: 'Analytics Updated',
    description: 'Real-time daily volume +$100.00 USDT, country metrics updated.',
    module: 'Analytics',
    status: 'COMPLETED',
    actor: 'BI Analytics',
  },
  {
    id: 'evt-7',
    timestamp: '09:12:08',
    title: 'Audit Logged',
    description: 'Immutable double-entry hash recorded: hash_99a182f01.',
    module: 'Audit',
    status: 'COMPLETED',
    actor: 'Audit Engine',
  },
];

const moduleColors: Record<string, string> = {
  Settlement: 'bg-usdt-green/20 text-usdt-green border-usdt-green/40',
  Treasury: 'bg-gold/20 text-gold border-gold/40',
  Machine: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  Referral: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  Notification: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  Analytics: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  Audit: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};

export const OperationsTimeline: React.FC<OperationsTimelineProps> = ({
  title = 'System Operations Timeline',
  events = DEFAULT_PLATFORM_EVENTS,
  mode = 'platform',
}) => {
  return (
    <div className="bg-card-bg rounded-2xl p-4 sm:p-5 border border-white/10 space-y-4 shadow-xl select-none">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <h3 className="text-sm font-black text-text-primary flex items-center gap-2">
            <Clock size={16} className="text-usdt-green" /> {title}
          </h3>
          <p className="text-xs text-text-tertiary mt-0.5">
            Step-by-step event trace explaining every automated state transition across modules.
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold text-usdt-green bg-usdt-green/20 px-2.5 py-0.5 rounded-full border border-usdt-green/30">
          Traceable & Explainable
        </span>
      </div>

      {/* Timeline Stream */}
      <div className="relative pl-4 sm:pl-6 space-y-4 before:absolute before:left-2 sm:before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
        {events.map((evt, idx) => (
          <div key={evt.id} className="relative group">
            {/* Timeline Dot */}
            <div className="absolute -left-4 sm:-left-6 top-1 w-3 h-3 rounded-full bg-usdt-green border-2 border-app-bg ring-4 ring-usdt-green/20" />

            <div className="p-3 rounded-2xl bg-control-bg/60 border border-white/5 space-y-1 hover:border-usdt-green/30 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-usdt-green">{evt.timestamp}</span>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${moduleColors[evt.module] || 'bg-white/10 text-text-secondary'}`}>
                    {evt.module}
                  </span>
                  <h4 className="text-xs font-extrabold text-text-primary">{evt.title}</h4>
                </div>
                {evt.actor && (
                  <span className="text-[10px] font-mono text-text-tertiary hidden sm:inline">by {evt.actor}</span>
                )}
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">{evt.description}</p>
            </div>

            {idx < events.length - 1 && (
              <div className="flex justify-center my-1">
                <ArrowDown size={12} className="text-text-tertiary opacity-50" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
