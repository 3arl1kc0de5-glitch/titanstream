import type React from 'react';
import { notifications } from '@/data/mock/notifications';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ShoppingCart, Store, Settings, ShieldAlert, ArrowUpFromLine, ChevronDown, Send } from 'lucide-react';
import { useState } from 'react';
import { MetricCard, MetricCardGrid } from '@/components/admin/MetricCard';

const typeIcons: Record<string, React.ReactNode> = {
  order: <ShoppingCart size={16} />,
  merchant: <Store size={16} />,
  system: <Settings size={16} />,
  alert: <ShieldAlert size={16} />,
  withdrawal: <ArrowUpFromLine size={16} />,
};

const typeStyles: Record<string, string> = {
  order: 'text-ton-blue bg-ton-blue/15',
  merchant: 'text-usdt-green bg-usdt-green/15',
  system: 'text-text-secondary bg-white/10',
  alert: 'text-error-red bg-error-red/15',
  withdrawal: 'text-gold bg-gold/15',
};

const statusVariant: Record<string, 'success' | 'default' | 'danger' | 'info'> = {
  sent: 'info',
  pending: 'default',
  failed: 'danger',
  delivered: 'success',
};

export const NotificationsPage: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [targetAudience, setTargetAudience] = useState('Public Channel');
  const [broadcastText, setBroadcastText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const announcementTemplates = [
    { title: '🔥 Power Machine Activated', text: '🔥 A new Power Machine has been activated on the TetherStream network!' },
    { title: '📈 Daily Cloud Activity Report', text: '📈 Today\'s cloud activity report is ready. All daily rewards processed.' },
    { title: '🌍 Uganda Milestone', text: '🌍 Uganda users crossed 5,000 active cloud computing members!' },
    { title: '⚡ Reward Distribution', text: '⚡ Reward distribution cycle completed. Check your derived wallet balance.' },
  ];

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      alert(`Broadcast successfully published to Telegram audience: "${targetAudience}"!`);
      setBroadcastText('');
    }, 800);
  };

  return (
    <div className="space-y-4">
      <MetricCardGrid columns={2}>
        <MetricCard label="Unread Alerts" value={notifications.filter(n => !n.read).length.toString()} icon="Bell" variant="gold" />
        <MetricCard label="Active Channels" value="4 Channels" icon="Send" variant="blue" />
      </MetricCardGrid>

      {/* Telegram Broadcast Engine Composer */}
      <div className="bg-card-bg rounded-xl p-4 border border-usdt-green/30 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Send size={16} className="text-usdt-green" /> Telegram Broadcast Engine
            </h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              Publish announcements directly to official Telegram public channels, private groups, or segmented user bases.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {/* Target Audience Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-text-tertiary">Target Audience:</span>
            {['Public Channel', 'Private Group', 'Uganda Users', 'Machine Owners', 'All Users'].map((aud) => (
              <button
                key={aud}
                type="button"
                onClick={() => setTargetAudience(aud)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                  targetAudience === aud
                    ? 'bg-usdt-green text-app-bg'
                    : 'bg-control-bg text-text-secondary hover:text-text-primary'
                }`}
              >
                {aud}
              </button>
            ))}
          </div>

          {/* Announcement Templates Quick Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[10px] font-bold uppercase text-text-tertiary shrink-0">Templates:</span>
            {announcementTemplates.map((t, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setBroadcastText(t.text)}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-text-secondary hover:text-text-primary hover:border-usdt-green shrink-0"
              >
                {t.title}
              </button>
            ))}
          </div>

          <form onSubmit={handleBroadcast} className="space-y-2">
            <textarea
              rows={3}
              placeholder={`Write broadcast message for ${targetAudience}...`}
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              className="w-full bg-control-bg text-text-primary text-xs rounded-xl p-3 border border-white/10 focus:border-usdt-green focus:outline-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-text-tertiary">
                Supports Telegram markdown, emojis & link previews
              </span>
              <button
                type="submit"
                disabled={isSending || !broadcastText.trim()}
                className="px-4 py-2.5 rounded-xl bg-usdt-green text-app-bg font-extrabold text-xs shadow-md hover:brightness-110 press-feedback disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send size={14} />
                <span>{isSending ? 'Publishing...' : 'Publish Telegram Broadcast'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-tertiary pt-2">System Notification Log</h4>
        {notifications.map((n) => {
          const isExpanded = expandedId === n.id;
          return (
            <div
              key={n.id}
              className={`bg-card-bg rounded-xl border border-border/50 ${!n.read ? 'border-l-2 border-l-usdt-green' : ''}`}
            >
              <div
                onClick={() => setExpandedId(isExpanded ? null : n.id)}
                className="flex items-start gap-3 p-3 sm:p-4 cursor-pointer active:bg-white/[0.02]"
              >
                <div className={`p-2 rounded-lg flex-shrink-0 ${typeStyles[n.type]}`}>
                  {typeIcons[n.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-text-primary truncate">{n.title}</h4>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-control-bg text-text-tertiary uppercase hidden sm:inline">{n.channel}</span>
                      <StatusBadge label={n.status} variant={statusVariant[n.status]} />
                    </div>
                  </div>
                  <p className="text-sm text-text-secondary mt-1 line-clamp-2">{n.message}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-text-tertiary">{n.createdAt}</span>
                    <ChevronDown size={14} className={`text-text-tertiary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-border pt-3 flex flex-wrap gap-2">
                  <button className="px-4 py-2.5 rounded-lg bg-usdt-green/15 text-usdt-green text-xs font-semibold min-h-[36px]">Mark Read</button>
                  <button className="px-4 py-2.5 rounded-lg bg-control-bg text-text-secondary text-xs min-h-[36px]">View Details</button>
                  <button className="px-4 py-2.5 rounded-lg bg-control-bg text-text-secondary text-xs min-h-[36px]">Retry</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
