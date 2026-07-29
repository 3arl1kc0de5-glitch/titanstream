import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Clock, RefreshCw, Filter, AlertCircle, Inbox, CheckCircle2 } from 'lucide-react';
import { useWalletStore } from '../../store/useWalletStore';
import type { TransactionRecord } from '../../services/financialService';
import type { SettlementSessionView } from '../../services/settlementService';
import { useTelegram } from '../../context/TelegramContext';

interface TransactionHistoryViewProps {
  onClose?: () => void;
}

export const TransactionHistoryView: React.FC<TransactionHistoryViewProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'deposits' | 'settlements'>('all');
  const [page, setPage] = useState<number>(0);
  const limit = 20;

  const {
    transactions,
    settlementHistory,
    isLoadingTransactions,
    isLoadingSettlements,
    fetchTransactions,
    fetchSettlementHistory,
  } = useWalletStore();

  const { hapticFeedback } = useTelegram();

  useEffect(() => {
    fetchTransactions(limit, page * limit);
    fetchSettlementHistory();
  }, [page, fetchTransactions, fetchSettlementHistory]);

  const handleRefresh = () => {
    hapticFeedback.impactOccurred('light');
    fetchTransactions(limit, page * limit);
    fetchSettlementHistory();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const combinedItems = React.useMemo(() => {
    // Combine transaction entries & settlement sessions for unified financial history view
    const txItems = (transactions || []).map((tx) => ({
      id: tx.id,
      type: tx.type || 'DEPOSIT',
      amount: tx.amount,
      asset: tx.asset || 'USDT',
      status: tx.status || 'COMPLETED',
      reference: tx.reference || tx.id.slice(-8),
      date: tx.createdAt,
      source: 'ledger',
    }));

    const settlementItems = (settlementHistory || []).map((s) => ({
      id: s.settlementId,
      type: 'SETTLEMENT',
      amount: s.expectedCryptoAmount || s.expectedAssetAmount || s.requestedAmount || '0.00',
      asset: s.asset || 'USDT',
      status: s.status,
      reference: s.referenceCode || s.reference || s.settlementId.slice(-8),
      date: s.createdAt || s.updatedAt,
      source: 'settlement',
    }));

    // Deduplicate by reference if ledger entry matches settlement
    const map = new Map<string, any>();
    [...settlementItems, ...txItems].forEach((item) => {
      if (!map.has(item.reference)) {
        map.set(item.reference, item);
      }
    });

    const merged = Array.from(map.values());
    merged.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    if (activeTab === 'deposits') {
      return merged.filter((i) => i.status === 'COMPLETED' || i.type === 'SYSTEM_ALLOCATION');
    }
    if (activeTab === 'settlements') {
      return merged.filter((i) => i.source === 'settlement');
    }

    return merged;
  }, [transactions, settlementHistory, activeTab]);

  const isLoading = isLoadingTransactions || isLoadingSettlements;

  return (
    <div className="w-full space-y-4">
      {/* View Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-extrabold text-text-primary">Transaction History</h3>
          <p className="text-xs text-text-tertiary">Real-time ledger & settlement activity log</p>
        </div>

        <button
          onClick={handleRefresh}
          className="press-feedback flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-text-secondary hover:text-text-primary"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-control-bg border border-white/10 text-xs">
        {[
          { key: 'all', label: 'All Activity' },
          { key: 'deposits', label: 'Completed Deposits' },
          { key: 'settlements', label: 'Settlement Requests' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              hapticFeedback.selectionChanged();
              setActiveTab(tab.key as any);
            }}
            className={`flex-1 py-1.5 rounded-lg font-extrabold transition-colors ${
              activeTab === tab.key
                ? 'bg-usdt-green text-app-bg shadow-sm'
                : 'text-text-tertiary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List Container */}
      {isLoading && combinedItems.length === 0 ? (
        /* Loading Skeleton */
        <div className="space-y-2 py-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-16 rounded-2xl glass-panel animate-pulse border border-white/5" />
          ))}
        </div>
      ) : combinedItems.length === 0 ? (
        /* Empty State */
        <div className="py-12 glass-panel rounded-2xl border border-white/10 flex flex-col items-center justify-center space-y-3 text-center">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-text-tertiary">
            <Inbox size={24} />
          </div>
          <h4 className="text-sm font-extrabold text-text-primary">No Transactions Yet</h4>
          <p className="text-xs text-text-tertiary max-w-[240px]">
            Your completed deposits and settlement requests will appear here.
          </p>
        </div>
      ) : (
        /* Transaction List */
        <div className="space-y-2">
          {combinedItems.map((item) => {
            const isCompleted = item.status === 'COMPLETED';
            const isPending = ['CREATED', 'WAITING_FOR_PAYMENT', 'VERIFYING', 'USDT_SENT', 'APPROVED'].includes(item.status);
            const isFailed = ['FAILED', 'EXPIRED', 'REJECTED', 'CANCELLED'].includes(item.status);

            return (
              <div
                key={item.id}
                className="glass-panel p-3.5 rounded-2xl border border-white/10 hover:border-white/20 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Icon indicator */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm ${
                      isCompleted
                        ? 'bg-usdt-green/20 text-usdt-green border border-usdt-green/30'
                        : isPending
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {isCompleted ? (
                      <ArrowDownLeft size={18} />
                    ) : isPending ? (
                      <Clock size={18} />
                    ) : (
                      <AlertCircle size={18} />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-text-primary">
                        {item.source === 'settlement' ? 'Funding Request' : 'Deposit Allocation'}
                      </span>
                      <span className="text-[10px] font-mono text-text-tertiary">
                        #{item.reference}
                      </span>
                    </div>

                    <div className="text-[11px] text-text-tertiary mt-0.5">
                      {formatDate(item.date)}
                    </div>
                  </div>
                </div>

                {/* Right Amount & Status Tag */}
                <div className="text-right">
                  <div className="text-sm font-mono font-extrabold text-text-primary">
                    +{item.amount} {item.asset}
                  </div>

                  <span
                    className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full mt-0.5 ${
                      isCompleted
                        ? 'text-usdt-green bg-usdt-green/10'
                        : isPending
                        ? 'text-amber-300 bg-amber-500/10'
                        : 'text-rose-400 bg-rose-500/10'
                    }`}
                  >
                    {item.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Simple Pagination controls */}
      <div className="flex items-center justify-between pt-2">
        <button
          disabled={page === 0}
          onClick={() => {
            hapticFeedback.selectionChanged();
            setPage((p) => Math.max(0, p - 1));
          }}
          className="press-feedback px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-text-secondary disabled:opacity-30"
        >
          Previous
        </button>

        <span className="text-xs font-mono font-bold text-text-tertiary">
          Page {page + 1}
        </span>

        <button
          disabled={combinedItems.length < limit}
          onClick={() => {
            hapticFeedback.selectionChanged();
            setPage((p) => p + 1);
          }}
          className="press-feedback px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-text-secondary disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </div>
  );
};
