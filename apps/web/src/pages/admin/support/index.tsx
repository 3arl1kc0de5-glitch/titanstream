import type React from 'react';
import { useState } from 'react';
import { useSupportStore, type TicketPriority, type TicketStatus } from '@/store/useSupportStore';
import { useWalletStore } from '@/store/useWalletStore';
import {
  MessageSquare,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Send,
  Lock,
  User,
  Shield,
  Zap,
  BookOpen,
  ArrowUpRight,
  PlusCircle,
  PhoneCall,
  Search,
} from 'lucide-react';
import { FinancialObjectViewer } from '@/components/FinancialObjectViewer';
import { MetricCard, MetricCardGrid } from '@/components/admin/MetricCard';

const statusColor: Record<TicketStatus, string> = {
  Open: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'Waiting for Customer': 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  'Waiting for Admin': 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse',
  'In Progress': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  Resolved: 'bg-usdt-green/20 text-usdt-green border-usdt-green/30',
  Escalated: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
};

const priorityColor: Record<TicketPriority, string> = {
  Low: 'text-text-tertiary',
  Normal: 'text-text-secondary',
  High: 'text-gold font-bold',
  Critical: 'text-error-red font-black animate-bounce',
};

export const AdminSupportPage: React.FC = () => {
  const {
    tickets,
    selectedTicketId,
    selectTicket,
    replyTicket,
    escalateTicket,
    resolveTicket,
    updatePriority,
    macros,
  } = useSupportStore();

  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [escalatedToRole, setEscalatedToRole] = useState('Treasury Review');

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  const filteredTickets = tickets.filter(
    (t) =>
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.reference.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openTicketsCount = tickets.filter((t) => t.status !== 'Resolved').length;
  const waitingAdminCount = tickets.filter((t) => t.status === 'Waiting for Admin').length;

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    replyTicket(selectedTicket.id, replyText.trim(), isInternalNote, 'Support Agent #01');
    setReplyText('');
  };

  const handleApplyMacro = (macroText: string) => {
    setReplyText((prev) => (prev ? `${prev}\n\n${macroText}` : macroText));
  };

  const handleAccreditSelectedUser = () => {
    if (!selectedTicket) return;
    const amountStr = prompt(`Accredit USDT balance for ${selectedTicket.userName}:`, '50');
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (amount > 0) {
      useWalletStore.getState().accreditUserBalance(amount, `Support Accreditation: Ticket ${selectedTicket.reference}`);
      replyTicket(
        selectedTicket.id,
        `System Note: Admin accredited +${amount} USDT directly to user wallet balance for Ticket ${selectedTicket.reference}.`,
        true,
        'System Ledger'
      );
      alert(`Accredited +${amount} USDT to ${selectedTicket.userName}!`);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Support Overview Metrics */}
      <MetricCardGrid columns={3}>
        <MetricCard label="Open Support Tickets" value={openTicketsCount.toString()} icon="MessageSquare" variant="blue" />
        <MetricCard label="Waiting for Admin" value={waitingAdminCount.toString()} icon="Clock" variant="gold" />
        <MetricCard label="Resolved Today" value="14" icon="CheckCircle" variant="green" />
      </MetricCardGrid>

      {/* Main Support Workspace Split Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-250px)] min-h-[600px]">
        {/* Ticket List Column (4 cols) */}
        <div className="lg:col-span-4 bg-card-bg border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-xl">
          {/* Search Header */}
          <div className="p-3 border-b border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-tertiary">Support Inbox</h3>
              <span className="text-[10px] font-mono font-bold bg-usdt-green/20 text-usdt-green px-2 py-0.5 rounded">
                Telegram Bot Sync
              </span>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-text-tertiary" />
              <input
                type="text"
                placeholder="Search ticket ref, user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-control-bg text-text-primary text-xs rounded-xl pl-8 pr-3 py-2 border border-white/10 focus:border-usdt-green focus:outline-none"
              />
            </div>
          </div>

          {/* Tickets Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5 no-scrollbar">
            {filteredTickets.map((t) => {
              const active = t.id === selectedTicket?.id;
              return (
                <div
                  key={t.id}
                  onClick={() => selectTicket(t.id)}
                  className={`p-3 cursor-pointer transition-colors ${
                    active ? 'bg-usdt-green/15 border-l-4 border-l-usdt-green' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-usdt-green">{t.reference}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${statusColor[t.status]}`}>
                      {t.status}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-text-primary truncate">{t.subject}</div>

                  <div className="flex items-center justify-between mt-2 text-[11px] text-text-tertiary">
                    <span>{t.userName} ({t.userCountry})</span>
                    <span className={priorityColor[t.priority]}>{t.priority}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Conversation & Action Workspace (5 cols) */}
        {selectedTicket ? (
          <div className="lg:col-span-5 bg-card-bg border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-xl">
            {/* Ticket Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-extrabold text-usdt-green">{selectedTicket.reference}</span>
                  <span className="text-xs text-text-tertiary">({selectedTicket.category})</span>
                </div>
                <h4 className="text-sm font-extrabold text-text-primary mt-0.5">{selectedTicket.subject}</h4>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEscalateModalOpen(true)}
                  className="press-feedback text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
                >
                  Escalate
                </button>
                <button
                  onClick={() => resolveTicket(selectedTicket.id)}
                  className="press-feedback text-xs font-bold px-2.5 py-1 rounded-lg bg-usdt-green text-app-bg hover:brightness-110 shadow-sm"
                >
                  Resolve
                </button>
              </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-app-bg/50 no-scrollbar">
              {selectedTicket.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-2xl max-w-[85%] text-xs space-y-1 ${
                    msg.internalNote
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-200 ml-auto'
                      : msg.sender === 'user'
                      ? 'bg-control-bg border border-white/10 text-text-primary mr-auto'
                      : 'bg-usdt-green/15 border border-usdt-green/30 text-text-primary ml-auto'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-[10px] opacity-80">
                    <span>
                      {msg.internalNote && <Lock size={10} className="inline mr-1 text-amber-400" />}
                      {msg.senderName}
                    </span>
                    <span className="font-mono">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
              ))}
            </div>

            {/* Response Macro Quick Inserter */}
            <div className="px-3 py-2 border-t border-white/10 bg-white/[0.01] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold text-text-tertiary shrink-0">Macros:</span>
              {macros.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleApplyMacro(m.text)}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-text-secondary hover:text-text-primary hover:border-usdt-green shrink-0 transition-colors"
                >
                  + {m.title}
                </button>
              ))}
            </div>

            {/* Reply Form */}
            <form onSubmit={handleSendReply} className="p-3 border-t border-white/10 space-y-2 bg-control-bg/60">
              <div className="flex items-center justify-between text-[11px]">
                <label className="flex items-center gap-1.5 cursor-pointer text-text-tertiary select-none">
                  <input
                    type="checkbox"
                    checked={isInternalNote}
                    onChange={(e) => setIsInternalNote(e.target.checked)}
                    className="rounded bg-control-bg border-white/20 text-usdt-green focus:ring-0"
                  />
                  <span>Private Internal Note (Hidden from Customer)</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={isInternalNote ? 'Type private staff note...' : 'Reply to customer (syncs to Telegram)...'}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className={`w-full text-xs rounded-xl px-3 py-2.5 border focus:outline-none ${
                    isInternalNote
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200 placeholder-amber-400/50'
                      : 'bg-control-bg border-white/10 text-text-primary focus:border-usdt-green'
                  }`}
                />
                <button
                  type="submit"
                  className={`press-feedback px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md ${
                    isInternalNote ? 'bg-amber-500 text-app-bg' : 'bg-usdt-green text-app-bg'
                  }`}
                >
                  <Send size={14} />
                  <span>{isInternalNote ? 'Note' : 'Send'}</span>
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {/* User Context & Operational Side Panel (3 cols) */}
        {selectedTicket && (
          <div className="lg:col-span-3 bg-card-bg border border-white/10 rounded-2xl p-4 flex flex-col justify-between overflow-y-auto shadow-xl space-y-4 no-scrollbar">
            <div className="space-y-4">
              <div className="border-b border-white/10 pb-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-tertiary mb-2">User Context</h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-usdt-green/20 text-usdt-green flex items-center justify-center font-bold text-sm">
                    {selectedTicket.userName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-text-primary">{selectedTicket.userName}</div>
                    <div className="text-xs font-mono text-text-tertiary">{selectedTicket.userUsername}</div>
                  </div>
                </div>
              </div>

              {/* Financial & Account Attributes */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-text-tertiary">Telegram ID:</span>
                  <span className="font-mono font-bold text-text-primary">{selectedTicket.userTelegramId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-text-tertiary">Country:</span>
                  <span className="font-bold text-text-primary">{selectedTicket.userCountry}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-text-tertiary">Controlled Balance:</span>
                  <span className="font-mono font-bold text-usdt-green">${(Number(selectedTicket.userBalanceUsdt) || 0).toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-text-tertiary">Running Machines:</span>
                  <span className="font-bold text-text-primary">{selectedTicket.runningMachinesCount} Units</span>
                </div>
              </div>

              {/* Visual Object Viewer Ticket Lifecycle stepper */}
              <div className="pt-2">
                <FinancialObjectViewer
                  type="support"
                  currentStatus={selectedTicket.status}
                  referenceCode={selectedTicket.reference}
                  additionalDetails={{
                    'Priority': selectedTicket.priority,
                    'Category': selectedTicket.category,
                  }}
                />
              </div>

              {/* Quick Operational Controls */}
              <div className="space-y-2 pt-2">
                <h5 className="text-[10px] font-bold uppercase text-text-tertiary">Admin Actions</h5>
                <button
                  onClick={handleAccreditSelectedUser}
                  className="press-feedback w-full py-2.5 px-3 rounded-xl bg-usdt-green/20 hover:bg-usdt-green/30 border border-usdt-green/40 text-usdt-green font-extrabold text-xs flex items-center justify-between"
                >
                  <span>Accredit User Wallet</span>
                  <PlusCircle size={14} />
                </button>
              </div>
            </div>

            {/* Knowledge Base Reference Card */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-text-secondary">
                <BookOpen size={14} className="text-usdt-green" />
                <span>Knowledge Base Quick Ref</span>
              </div>
              <p className="text-[11px] text-text-tertiary leading-relaxed">
                Mobile USSD payment prompt uses code <span className="font-mono font-bold text-usdt-green">*165*1*1*</span>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Escalation Modal */}
      {escalateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-app-bg border border-white/10 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-extrabold text-text-primary">Escalate Ticket #{selectedTicket?.reference}</h3>
            <p className="text-xs text-text-tertiary">
              Select department or supervisory role to escalate this customer issue.
            </p>

            <div className="space-y-2">
              {['Treasury Review', 'Settlement Review', 'Technical Review', 'Fraud Review', 'Founder Review'].map((role) => (
                <button
                  key={role}
                  onClick={() => setEscalatedToRole(role)}
                  className={`w-full p-3 rounded-xl border text-xs font-bold text-left flex items-center justify-between ${
                    escalatedToRole === role
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-control-bg border-white/10 text-text-secondary'
                  }`}
                >
                  <span>{role}</span>
                  {escalatedToRole === role && <CheckCircle2 size={14} className="text-amber-400" />}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  if (selectedTicket) {
                    escalateTicket(selectedTicket.id, escalatedToRole);
                    setEscalateModalOpen(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-app-bg font-extrabold text-xs shadow-md"
              >
                Confirm Escalation
              </button>
              <button
                onClick={() => setEscalateModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-text-secondary text-xs font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
