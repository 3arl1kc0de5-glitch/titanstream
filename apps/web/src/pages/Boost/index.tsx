import type React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { showToast } from '../../components/Toast';
import { useMiningStore } from '../../store/useMiningStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useTreasuryStore } from '../../store/useTreasuryStore';
import { useTelegram } from '../../context/TelegramContext';
import { machineService } from '../../services/machineService';
import { MACHINE_CATALOG, getMachineYieldDetails, type FrontendMachineModel } from '../../data/machines';
import { MachineEducationModal } from '../../components/MachineEducationModal';
import { ComputeNodeSvg } from '../../components/ComputeNodeSvg';
import { CountUpNumber } from '../../components/CountUpNumber';
import { 
  Gauge, 
  Sparkles, 
  AlertCircle, 
  ArrowUpRight, 
  TrendingUp, 
  Clock, 
  Smartphone,
  Bot,
  CheckCircle2,
  X,
  QrCode,
  HelpCircle,
  Zap,
  ShieldCheck,
  Cpu,
  BarChart3,
  Layers
} from 'lucide-react';

export const BoostScreen: React.FC = () => {
  const { baseSpeedGhs, upgradeBaseSpeed } = useMiningStore();
  const { preferLocalCurrency } = useSettingsStore();
  const { hapticFeedback } = useTelegram();
  const { transactions } = useWalletStore();
  const { adjustTreasuryStats, adjustTrustScore } = useTreasuryStore();

  // Onboarding education modal state
  const [showEducationModal, setShowEducationModal] = useState(false);

  // Payment states
  const [selectedMachine, setSelectedMachine] = useState<FrontendMachineModel | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<'CRYPTOBOT' | 'MOBILE_MONEY'>('CRYPTOBOT');
  const [invoiceStatus, setInvoiceStatus] = useState<'NONE' | 'PENDING' | 'PAID'>('NONE');
  const [phoneNo, setPhoneNo] = useState('+256 771 234 567');
  const [mnoNetwork, setMnoNetwork] = useState('MTN Momo');
  const [invoiceId, setInvoiceId] = useState('');
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes

  // Auto show machine education modal on first visit (v2 logic)
  useEffect(() => {
    const hasSeen = localStorage.getItem('has_seen_machine_education_v2');
    if (!hasSeen) {
      setShowEducationModal(true);
    }
  }, []);

  useEffect(() => {
    let interval: number;
    if (invoiceStatus === 'PENDING' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000) as any;
    }
    return () => clearInterval(interval);
  }, [invoiceStatus, timeLeft]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleBuy = (machine: FrontendMachineModel) => {
    hapticFeedback.impactOccurred('medium');
    setSelectedMachine(machine);
    setShowCheckout(true);
    setInvoiceStatus('NONE');
    setPaymentProvider(preferLocalCurrency ? 'MOBILE_MONEY' : 'CRYPTOBOT');
    setInvoiceId(`INV-${machine.tierCode}-${Math.floor(100000 + Math.random() * 900000)}`);
    setTimeLeft(900);
  };

  const handleGenerateInvoice = async () => {
    if (!selectedMachine) return;
    hapticFeedback.impactOccurred('medium');

    try {
      const res = await machineService.purchaseMachine(selectedMachine.tierCode);
      if (res.success) {
        hapticFeedback.notificationOccurred('success');
        upgradeBaseSpeed(selectedMachine.capacityGhs);
        await useWalletStore.getState().fetchBalanceFromEngine();
        setInvoiceStatus('PAID');
        showToast(`Machine ${selectedMachine.name} activated!`, 'success');
      } else if (res.requiresFunding) {
        showToast(`Payment order ${res.paymentOrder?.reference} initiated!`, 'warning');
        setInvoiceStatus('PENDING');
      }
    } catch (err: any) {
      showToast(err?.message || 'Purchase failed', 'error');
    }
  };

  const handlePaymentSuccess = () => {
    if (!selectedMachine) return;
    hapticFeedback.notificationOccurred('success');

    // Upgrade baseline speed by machine capacity
    upgradeBaseSpeed(selectedMachine.capacityGhs);

    // Adjust stats in useTreasuryStore
    adjustTreasuryStats('BOOST', selectedMachine.priceUsdt);
    adjustTrustScore(5);

    // Create transaction record
    const newTx = {
      id: `tx-mach-${Date.now()}`,
      financialAccountId: 'acc-main',
      type: 'MACHINE_PURCHASE',
      asset: 'USDT',
      amount: (Number(selectedMachine?.priceUsdt) || 0).toFixed(2),
      status: 'COMPLETED',
      reference: invoiceId,
      createdAt: new Date().toISOString(),
      description: `Activated ${selectedMachine.name} (${selectedMachine.capacityGhs} GH/s)`
    };

    useWalletStore.getState().updateBalance({
      transactions: [newTx, ...transactions]
    });

    setInvoiceStatus('PAID');
    showToast(`${selectedMachine.name} activated successfully!`, 'success');

    setTimeout(() => {
      setShowCheckout(false);
      setSelectedMachine(null);
    }, 2000);
  };

  return (
    <div className="p-4 sm:p-5 flex flex-col gap-5 select-none relative z-10 max-w-lg mx-auto pb-24 font-sans">
      {/* Page Title & Intro */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-1.5"
      >
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-black tracking-widest text-usdt-green bg-usdt-green/15 px-3 py-1 rounded-full border border-usdt-green/30 flex items-center gap-1.5 uppercase">
            <Zap size={11} className="text-usdt-green" /> Cloud Computing Marketplace
          </div>
          <button
            onClick={() => setShowEducationModal(true)}
            className="text-[11px] font-bold text-text-tertiary hover:text-usdt-green flex items-center gap-1 bg-white/5 border border-white/10 px-3 py-1 rounded-full transition-colors"
          >
            <HelpCircle size={13} />
            <span>How it works</span>
          </button>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight mt-1">
          Cloud Capacity Tiers
        </h1>
        <p className="text-xs text-text-secondary leading-relaxed font-medium">
          Invest in cloud computing capacity that generates projected daily earnings. Higher tiers allocate greater computing capacity.
        </p>
      </motion.div>

      {/* Active Capacity Dashboard Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-panel rounded-2xl p-4 flex items-center justify-between relative overflow-hidden border border-usdt-green/30 bg-gradient-to-r from-usdt-green/10 via-card-bg to-control-bg/60 shadow-lg"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-usdt-green/20 border border-usdt-green/40 flex items-center justify-center text-usdt-green shadow-md">
            <Gauge size={22} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-text-tertiary uppercase tracking-wider">Active Cloud Allocation</span>
            <span className="text-xl font-black text-text-primary font-mono mt-0.5">{(Number(baseSpeedGhs) || 0).toFixed(1)} GH/s</span>
          </div>
        </div>

        <span className="text-[9px] font-black text-usdt-green bg-usdt-green/20 px-3 py-1 rounded-full border border-usdt-green/40 tracking-wider animate-pulse uppercase">
          Operational
        </span>
      </motion.div>

      {/* Section Header */}
      <div className="flex items-center justify-between mt-1">
        <h2 className="text-xs font-black text-text-tertiary tracking-widest uppercase flex items-center gap-2">
          <TrendingUp size={13} className="text-usdt-green" /> Five Earning Tiers
        </h2>
        <span className="text-xs font-mono text-usdt-green bg-usdt-green/10 border border-usdt-green/30 px-2.5 py-0.5 rounded-full font-extrabold">
          5 Tiers Available
        </span>
      </div>

      {/* Machines Marketplace Cards — STRICT 7-LEVEL HIERARCHY */}
      <div className="flex flex-col gap-5">
        {MACHINE_CATALOG.map((machine, idx) => {
          const yieldDetails = getMachineYieldDetails(machine);

          return (
            <motion.div
              key={machine.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className={`relative rounded-3xl p-5 flex flex-col gap-4 border transition-all shadow-xl overflow-hidden ${
                machine.isPopular
                  ? 'bg-gradient-to-br from-usdt-green/20 via-card-bg to-[#0d1319] border-usdt-green/60 shadow-usdt-green/15'
                  : machine.tierCode === 'TS_Q2500'
                  ? 'bg-gradient-to-br from-amber-500/15 via-card-bg to-[#17120a] border-amber-500/50 shadow-amber-500/10'
                  : machine.tierCode === 'TS_X1000'
                  ? 'bg-gradient-to-br from-purple-500/15 via-card-bg to-[#130b1c] border-purple-500/50 shadow-purple-500/10'
                  : 'bg-card-bg/95 border-white/10 hover:border-usdt-green/40'
              }`}
            >
              {/* Most Popular Badge */}
              {machine.isPopular && (
                <div className="absolute top-0 right-0 bg-usdt-green text-app-bg font-black text-[9px] px-3.5 py-1 rounded-bl-2xl uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <Sparkles size={10} /> Most Popular Tier
                </div>
              )}

              {/* LEVEL 1: ESTIMATED DAILY EARNINGS (HERO ELEMENT) */}
              <div className="bg-app-bg/90 border border-white/10 rounded-2xl p-4 flex flex-col gap-1.5 shadow-inner">
                <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest flex items-center gap-1.5">
                  <BarChart3 size={12} className="text-usdt-green" /> Today's Estimated Daily Output
                </span>

                <div className="flex items-baseline gap-2 mt-0.5">
                  <div className="text-2xl sm:text-3xl font-black text-usdt-green font-mono tracking-tight">
                    {yieldDetails.daily.local}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-text-secondary border-t border-white/5 pt-1.5 mt-1">
                  <span>≈ ${(Number(machine?.dailyYieldUsdt) || 0).toFixed(2)} USDT / day</span>
                  <span className="text-text-tertiary font-normal">Monthly: <strong className="text-text-primary">{yieldDetails.monthly.local}</strong></span>
                </div>
              </div>

              {/* LEVEL 2: MACHINE PRICE (LOCAL CURRENCY FIRST) */}
              <div className="flex items-center justify-between px-1">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-text-tertiary uppercase tracking-wider">Asset Price</span>
                  <span className="text-xl font-black text-text-primary font-mono tracking-tight">
                    {yieldDetails.price.local}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-usdt-green">
                    ≈ ${(Number(machine?.priceUsdt) || 0).toFixed(2)} USDT
                  </span>
                </div>

                {/* Performance Badge */}
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[9px] font-black text-usdt-green bg-usdt-green/15 px-3 py-1 rounded-full border border-usdt-green/30 uppercase tracking-wider">
                    {machine.performanceLevel}
                  </span>
                  <span className="text-[9px] font-bold text-text-tertiary font-mono">{machine.tierLabel}</span>
                </div>
              </div>

              {/* LEVEL 3 & 4: MACHINE NAME & POSITIONING */}
              <div className="flex items-center gap-3.5 pt-1">
                <ComputeNodeSvg tierCode={machine.tierCode} isPopular={machine.isPopular} />
                <div>
                  <h3 className="text-base font-black text-text-primary tracking-tight">{machine.name}</h3>
                  <span className="text-xs font-semibold text-usdt-green block mt-0.5">
                    {machine.targetUser}
                  </span>
                </div>
              </div>

              {/* LEVEL 5: SHORT EXPLANATION */}
              <p className="text-xs text-text-secondary leading-relaxed font-medium">
                {machine.simpleExplanation}
              </p>

              {/* LEVEL 6: ACQUIRE BUTTON */}
              <button
                onClick={() => handleBuy(machine)}
                className={`w-full press-feedback py-3.5 rounded-2xl font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 border transition-all shadow-lg ${
                  machine.isPopular
                    ? 'bg-gradient-to-r from-usdt-green to-[#00c853] text-app-bg border-usdt-green hover:brightness-110 shadow-usdt-green/20'
                    : 'bg-gradient-to-r from-white/15 to-white/5 text-text-primary border-white/20 hover:bg-white/20'
                }`}
              >
                <span>Acquire {machine.name}</span>
                <ArrowUpRight size={16} />
              </button>

              {/* LEVEL 7: TECHNICAL INFORMATION & UNDERSTANDABLE INDICATORS */}
              <div className="flex flex-col gap-2 bg-white/[0.02] border border-white/5 rounded-2xl p-3 text-xs">
                {/* Visual Capacity Allocation Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                    <span className="text-text-tertiary flex items-center gap-1">
                      <Layers size={11} className="text-usdt-green" /> Cloud Workload Capacity
                    </span>
                    <span className="text-text-primary font-mono">{machine.computeCapacityText}</span>
                  </div>
                  <div className="w-full h-2 bg-control-bg rounded-full overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-usdt-green/60 to-usdt-green rounded-full transition-all duration-500"
                      style={{ width: `${machine.capacityScore}%` }}
                    />
                  </div>
                </div>

                {/* Understandable Rating Badges */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-text-tertiary pt-1">
                  <div>Priority: <strong className="text-text-primary">{machine.processingPriority}</strong></div>
                  <div>Rating: <strong className="text-text-primary">{machine.dailyOutputRating}</strong></div>
                </div>

                {/* Upgrade Comparison Statement */}
                {machine.comparisonText && (
                  <div className="text-[10px] font-extrabold text-usdt-green bg-usdt-green/10 border border-usdt-green/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 mt-1">
                    <Sparkles size={12} className="shrink-0 text-usdt-green" />
                    <span>{machine.comparisonText}</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Onboarding Education Modal */}
      <MachineEducationModal
        isOpen={showEducationModal}
        onClose={() => setShowEducationModal(false)}
      />

      {/* DYNAMIC CHECKOUT & MACHINE DETAILS MODAL */}
      <AnimatePresence>
        {showCheckout && selectedMachine && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 pb-20 sm:pb-4">
            {/* Backdrop click closer */}
            {invoiceStatus !== 'PAID' && (
              <div 
                className="absolute inset-0 z-10" 
                onClick={() => {
                  hapticFeedback.impactOccurred('light');
                  setShowCheckout(false);
                  setSelectedMachine(null);
                }}
              />
            )}

            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="w-full max-w-md bg-app-bg border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl overflow-y-auto max-h-[90vh] z-20 font-sans"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-usdt-green" />
                  <h3 className="text-base font-black text-text-primary">
                    {invoiceStatus === 'PAID' ? 'Machine Activated' : 'Machine Asset Details'}
                  </h3>
                </div>
                {invoiceStatus !== 'PAID' && (
                  <button
                    onClick={() => {
                      hapticFeedback.impactOccurred('light');
                      setShowCheckout(false);
                      setSelectedMachine(null);
                    }}
                    className="press-feedback p-1.5 rounded-full bg-white/5 border border-white/10 text-text-secondary hover:text-text-primary"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Machine Details & Checkout Flow */}
              {invoiceStatus === 'NONE' && (
                <div className="space-y-4">
                  {/* Detailed Asset Summary */}
                  <div className="p-4.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-base font-black text-text-primary">{selectedMachine.name}</h4>
                        <span className="text-xs font-extrabold text-usdt-green">{selectedMachine.targetUser}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-text-primary font-mono block">
                          {getMachineYieldDetails(selectedMachine).price.local}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-usdt-green">
                          ≈ {getMachineYieldDetails(selectedMachine).price.usdt}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-app-bg p-3 rounded-xl border border-white/5 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-text-tertiary block font-sans uppercase">Daily Yield</span>
                        <strong className="text-usdt-green text-sm">{getMachineYieldDetails(selectedMachine).daily.local}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-tertiary block font-sans uppercase">Monthly Yield</span>
                        <strong className="text-text-primary text-sm">{getMachineYieldDetails(selectedMachine).monthly.local}</strong>
                      </div>
                    </div>

                    <div className="text-xs text-text-secondary leading-relaxed font-medium">
                      {selectedMachine.description}
                    </div>

                    <div className="text-[10px] text-text-tertiary italic bg-white/[0.02] p-2.5 rounded-xl border border-white/5 flex items-start gap-1.5">
                      <Cpu size={14} className="text-usdt-green shrink-0 mt-0.5" />
                      <span>"{selectedMachine.technicalSummary}"</span>
                    </div>
                  </div>

                  {/* Payment Rail Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-text-secondary uppercase tracking-wider">
                      Select Payment Rail
                    </label>

                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          hapticFeedback.selectionChanged();
                          setPaymentProvider('MOBILE_MONEY');
                        }}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all text-left ${
                          paymentProvider === 'MOBILE_MONEY'
                            ? 'bg-usdt-green/15 border-usdt-green text-usdt-green'
                            : 'bg-white/5 border-white/10 text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Smartphone size={20} className={paymentProvider === 'MOBILE_MONEY' ? 'text-usdt-green' : 'text-text-secondary'} />
                          <div>
                            <span className="text-xs font-extrabold block">Mobile Money Rail (Primary)</span>
                            <span className="text-[10px] text-text-tertiary">Pay using MTN MoMo, Airtel, or M-Pesa local rates</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-usdt-green/20 text-usdt-green rounded-full border border-usdt-green/30">UGX / RWF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          hapticFeedback.selectionChanged();
                          setPaymentProvider('CRYPTOBOT');
                        }}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all text-left ${
                          paymentProvider === 'CRYPTOBOT'
                            ? 'bg-sky-500/15 border-sky-400 text-sky-300'
                            : 'bg-white/5 border-white/10 text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Bot size={20} className={paymentProvider === 'CRYPTOBOT' ? 'text-sky-400' : 'text-text-secondary'} />
                          <div>
                            <span className="text-xs font-extrabold block">Telegram @CryptoBot</span>
                            <span className="text-[10px] text-text-tertiary">Pay instantly using Telegram wallet (USDT)</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-sky-500/20 text-sky-400 rounded-full border border-sky-500/30">USDT</span>
                      </button>
                    </div>
                  </div>

                  {/* Generate Invoice Button */}
                  <button
                    onClick={handleGenerateInvoice}
                    className="w-full py-3.5 rounded-2xl bg-usdt-green text-app-bg font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-usdt-green/20 hover:brightness-110 press-feedback"
                  >
                    <span>Acquire {selectedMachine.name}</span>
                    <ArrowUpRight size={16} />
                  </button>
                </div>
              )}

              {invoiceStatus === 'PENDING' && (
                <div className="space-y-4">
                  {/* Pending Invoice Summary */}
                  <div className="p-4.5 rounded-2xl bg-[#090b11]/80 border border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <span className="text-[10px] font-mono font-bold text-text-tertiary uppercase">Invoice Ref</span>
                    <span className="text-sm font-mono font-black text-text-primary mt-0.5">{invoiceId}</span>

                    <div className="w-18 h-18 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 my-4">
                      <QrCode size={48} className="text-text-secondary" />
                    </div>

                    <span className="text-[10px] font-bold text-usdt-green bg-usdt-green/10 border border-usdt-green/20 px-3 py-1 rounded-full animate-pulse flex items-center gap-1">
                      <Clock size={12} /> {formatTime(timeLeft)} remaining
                    </span>
                  </div>

                  {paymentProvider === 'MOBILE_MONEY' ? (
                    <div className="space-y-3.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-text-tertiary uppercase">Network</label>
                          <select
                            value={mnoNetwork}
                            onChange={(e) => setMnoNetwork(e.target.value)}
                            className="bg-control-bg border border-white/10 rounded-xl p-2.5 text-xs text-text-primary focus:outline-none focus:border-usdt-green"
                          >
                            <option value="MTN Momo">MTN Momo</option>
                            <option value="Airtel Money">Airtel Money</option>
                            <option value="M-Pesa">M-Pesa</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-text-tertiary uppercase">Phone Number</label>
                          <input
                            type="text"
                            value={phoneNo}
                            onChange={(e) => setPhoneNo(e.target.value)}
                            className="bg-control-bg border border-white/10 rounded-xl p-2.5 text-xs text-text-primary focus:outline-none focus:border-usdt-green"
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-[11px] text-text-tertiary flex items-start gap-2">
                        <AlertCircle size={15} className="text-usdt-green shrink-0 mt-0.5" />
                        <span>
                          Pay via local mobile money. You will receive an STK pin prompt on your device.
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => showToast('Payment push prompt sent!', 'info')}
                        className="w-full py-3.5 rounded-xl bg-usdt-green text-app-bg font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md hover:brightness-110 press-feedback"
                      >
                        <Smartphone size={15} />
                        <span>Send Payment Push Prompt</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-[11px] text-text-tertiary flex items-start gap-2">
                        <AlertCircle size={15} className="text-sky-400 shrink-0 mt-0.5" />
                        <span>Please send payment of <strong>{(Number(selectedMachine?.priceUsdt) || 0).toFixed(2)} USDT</strong> via @CryptoBot. Your Machine activates immediately after provider confirmation.</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => window.open('https://t.me/CryptoBot', '_blank')}
                        className="w-full py-3.5 rounded-xl bg-sky-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md hover:brightness-110 press-feedback"
                      >
                        <Bot size={15} />
                        <span>Pay via Telegram @CryptoBot</span>
                      </button>
                    </div>
                  )}

                  {/* Sandbox simulation button */}
                  <div className="pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={handlePaymentSuccess}
                      className="w-full py-3 rounded-xl bg-usdt-green text-app-bg font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md hover:brightness-110 press-feedback animate-pulse"
                    >
                      <Sparkles size={14} />
                      <span>Simulate Payment Success (Sandbox) ⚡</span>
                    </button>
                  </div>
                </div>
              )}

              {invoiceStatus === 'PAID' && (
                <div className="py-6 flex flex-col items-center justify-center text-center space-y-4 font-sans">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-16 h-16 rounded-full bg-usdt-green/10 border border-usdt-green flex items-center justify-center"
                  >
                    <CheckCircle2 size={36} className="text-usdt-green animate-bounce" />
                  </motion.div>

                  <h3 className="text-lg font-black text-text-primary">Machine Activated!</h3>
                  <p className="text-xs text-text-secondary max-w-xs leading-relaxed font-medium">
                    Your machine <strong>{selectedMachine.name}</strong> is now live. Your daily compute capacity has been permanently upgraded.
                  </p>

                  <button
                    onClick={() => {
                      setShowCheckout(false);
                      setSelectedMachine(null);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-usdt-green text-app-bg font-black text-xs uppercase tracking-wider shadow-md hover:brightness-110"
                  >
                    Return to Hub
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
