import type React from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, CheckCheck, Wallet, Zap, Gift, Users, Headphones, Settings, Trash2 } from 'lucide-react';
import { useUserNotificationStore, type UserNotificationCategory } from '../store/useUserNotificationStore';
import { useTelegram } from '../context/TelegramContext';
import { useNavigationStore } from '../store/useNavigationStore';

interface UserNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const categoryIcons: Record<UserNotificationCategory, React.ReactNode> = {
  Deposit: <Wallet size={16} className="text-usdt-green" />,
  Withdrawal: <Wallet size={16} className="text-amber-400" />,
  Reward: <Zap size={16} className="text-cyan-400" />,
  Machine: <Zap size={16} className="text-purple-400" />,
  Referral: <Users size={16} className="text-gold" />,
  Support: <Headphones size={16} className="text-rose-400" />,
  System: <Settings size={16} className="text-text-secondary" />,
};

export const UserNotificationModal: React.FC<UserNotificationModalProps> = ({ isOpen, onClose }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useUserNotificationStore();
  const { hapticFeedback } = useTelegram();
  const { setActiveTab } = useNavigationStore();
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  if (!isOpen) return null;

  const filtered = filterCategory === 'ALL'
    ? notifications
    : notifications.filter((n) => n.category === filterCategory);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 select-none overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="w-full max-w-md bg-app-bg border border-white/10 rounded-3xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto my-auto space-y-4"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-usdt-green/20 text-usdt-green flex items-center justify-center relative">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-mono font-bold text-[9px] flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-base font-extrabold text-text-primary">Notifications Center</h2>
                <p className="text-[11px] text-text-tertiary">Real-time alerts for payments, rewards & updates</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  onClick={() => {
                    hapticFeedback.impactOccurred('medium');
                    markAllAsRead();
                  }}
                  className="press-feedback p-1.5 rounded-xl bg-usdt-green/20 text-usdt-green border border-usdt-green/30 text-xs font-bold flex items-center gap-1"
                  title="Mark All as Read"
                >
                  <CheckCheck size={14} />
                  <span className="hidden sm:inline">Read All</span>
                </button>
              )}
              <button
                onClick={() => {
                  hapticFeedback.impactOccurred('light');
                  onClose();
                }}
                className="press-feedback p-1.5 rounded-full bg-white/5 border border-white/10 text-text-secondary hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {['ALL', 'Deposit', 'Reward', 'Referral', 'Support'].map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  hapticFeedback.selectionChanged();
                  setFilterCategory(cat);
                }}
                className={`px-3 py-1 rounded-xl text-[10px] font-extrabold transition-all shrink-0 ${
                  filterCategory === cat
                    ? 'bg-usdt-green text-app-bg shadow-md'
                    : 'bg-control-bg text-text-secondary hover:text-text-primary border border-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1 no-scrollbar">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-tertiary space-y-2">
                <Bell size={28} className="mx-auto text-text-tertiary/40" />
                <p>No notifications in this category.</p>
              </div>
            ) : (
              filtered.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.read) markAsRead(n.id);
                    if (n.actionTab) {
                      setActiveTab(n.actionTab as any);
                      onClose();
                    }
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
                    !n.read
                      ? 'bg-usdt-green/10 border-usdt-green/40 shadow-sm'
                      : 'bg-control-bg/40 border-white/5 hover:bg-control-bg/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 rounded-xl bg-control-bg border border-white/10 shrink-0">
                        {categoryIcons[n.category]}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-text-primary">{n.title}</h4>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-usdt-green animate-pulse" />
                          )}
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed">{n.message}</p>
                        <div className="flex items-center justify-between text-[10px] text-text-tertiary font-mono pt-1">
                          <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {n.actionTab && (
                            <span className="text-usdt-green font-bold uppercase tracking-wider">Tap to view →</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        hapticFeedback.impactOccurred('light');
                        clearNotification(n.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-text-tertiary hover:text-error-red transition-opacity"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="pt-2 text-center border-t border-white/5">
            <p className="text-[10px] text-text-tertiary font-mono">
              Notifications sync across browser & Telegram App
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
