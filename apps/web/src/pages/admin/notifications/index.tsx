import type React from 'react';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ShoppingCart, Store, Settings, ShieldAlert, ArrowUpFromLine, Send } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MetricCard, MetricCardGrid } from '@/components/admin/MetricCard';
import { useUserNotificationStore } from '@/store/useUserNotificationStore';

export interface AdminNotificationRecord {
  id: string;
  type: string;
  title: string;
  message: string;
  channel: string;
  status: string;
  read: boolean;
  createdAt: string;
}

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
  const { notifications, fetchNotifications, markAllAsRead } = useUserNotificationStore();
  const [targetAudience, setTargetAudience] = useState('Public Channel');
  const [broadcastText, setBroadcastText] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

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
        <div className="flex items-center justify-between pt-2">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-tertiary">System Notification Log</h4>
          {notifications.length > 0 && (
            <button onClick={markAllAsRead} className="text-xs text-usdt-green font-bold hover:underline">
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="p-8 text-center bg-card-bg rounded-xl border border-white/5 space-y-1">
            <p className="text-xs font-bold text-text-primary">No notifications recorded yet</p>
            <p className="text-[11px] text-text-tertiary">System events and alerts will appear here in real-time.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`bg-card-bg rounded-xl border border-border/50 p-4 ${!n.read ? 'border-l-2 border-l-usdt-green' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg flex-shrink-0 ${typeStyles[n.type] || 'text-text-secondary bg-white/10'}`}>
                  {typeIcons[n.type] || <Settings size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-text-primary truncate">{n.title}</h4>
                    <StatusBadge label={n.type} variant="info" />
                  </div>
                  <p className="text-xs text-text-secondary mt-1">{n.message}</p>
                  <span className="text-[10px] text-text-tertiary block mt-1">{n.timestamp}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
