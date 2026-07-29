import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, ChevronDown, ChevronUp, Server, DollarSign, ArrowUpRight, ShieldCheck, Clock, Zap, Headphones, TrendingUp, Sparkles, Wallet, Users } from 'lucide-react';
import { useTelegram } from '../context/TelegramContext';
import { useSupportStore } from '../store/useSupportStore';
import { useWalletStore } from '../store/useWalletStore';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  icon: React.ReactNode;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const { hapticFeedback } = useTelegram();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const faqItems: FAQItem[] = [
    {
      id: 'what_is',
      question: 'What is TitanStream?',
      answer: 'TitanStream is a simple way for ordinary people to participate in the growing cloud computing economy. By pooling resources together, users help secure high-performance computing capacity that businesses rent daily. We share the generated rental revenue directly with you.',
      icon: <Server size={20} className="text-usdt-green" />
    },
    {
      id: 'how_works',
      question: 'How does it work?',
      answer: 'You fund a Machine to reserve a portion of our cloud computing network. Businesses rent this power to run software, AI models, and complex calculations. You receive your share of the rental fees in real-time as businesses pay to use the network.',
      icon: <Zap size={20} className="text-cyan-400" />
    },
    {
      id: 'source_funds',
      question: 'Where does the money come from?',
      answer: 'The money comes from real companies that pay to rent computing power. Millions of businesses need computing power every second to run their software, generate videos, and automate tasks. The rental revenue they pay is distributed directly to our network contributors.',
      icon: <DollarSign size={20} className="text-amber-400" />
    },
    {
      id: 'why_profitable',
      question: 'Why does cloud computing make money?',
      answer: 'Computing power is the fuel of the modern internet. Every website, app, database, and game runs on a cloud server. Because digital activities are growing exponentially, the demand for computing power is higher than ever before, creating a highly profitable industry.',
      icon: <TrendingUp size={20} className="text-emerald-400" />
    },
    {
      id: 'ai_demand',
      question: 'Why is AI making cloud computers more valuable?',
      answer: 'Artificial Intelligence requires massive, non-stop computing power to think, learn, and generate content. Top companies like OpenAI, Microsoft, and Google rely heavily on giant networks of cloud computers to run their AI tools. This massive demand has made cloud computing one of the fastest-growing industries in the world.',
      icon: <Sparkles size={20} className="text-purple-400" />
    },
    {
      id: 'why_rent',
      question: 'Why do companies rent computers instead of buying them?',
      answer: 'Buying, housing, and maintaining physical servers costs companies thousands of dollars in hardware and electricity. Renting cloud capacity on demand is much cheaper, more flexible, and lets businesses scale instantly without long-term hardware maintenance costs.',
      icon: <Clock size={20} className="text-rose-400" />
    },
    {
      id: 'phone_off',
      question: 'Why do earnings continue when my phone is off?',
      answer: 'Your earnings do not rely on your mobile phone or home internet. The cloud computers you support run 24/7 in professional, high-security data centers. They are always active, always rented, and always generating revenue regardless of your device status.',
      icon: <Clock size={20} className="text-sky-400" />
    },
    {
      id: 'compute_power',
      question: 'What is Compute Power?',
      answer: 'Compute Power is the raw processing speed of a computer, measured in Compute Units (CU). The more Compute Power your Machine has, the more complex tasks it can handle for businesses, and the higher your share of the global rental revenue.',
      icon: <Zap size={20} className="text-orange-400" />
    },
    {
      id: 'machines_work',
      question: 'How do Machines work?',
      answer: 'Machines are packages of cloud computing capacity. When you unlock a higher tier Machine, you fund a larger allocation of server power. This increases your compute contribution and unlocks higher estimated daily rewards.',
      icon: <Server size={20} className="text-indigo-400" />
    },
    {
      id: 'deposits',
      question: 'How do deposits work?',
      answer: 'Funding your account is a safe payment process. You can deposit USDT or your local currency instantly using secure mobile money rails. Once verified by our system, your funds immediately activate your chosen Machine tier.',
      icon: <Wallet size={20} className="text-teal-400" />
    },
    {
      id: 'withdrawals',
      question: 'How do withdrawals work?',
      answer: 'You can withdraw your earnings instantly at any time. We support direct transfers to your local mobile money account, Telegram CryptoBot, or your personal USDT wallet. Withdrawals are processed immediately with zero hidden fees.',
      icon: <ArrowUpRight size={20} className="text-green-400" />
    },
    {
      id: 'usdt',
      question: 'What is USDT?',
      answer: 'USDT is a stable digital currency pegged 1-to-1 with the US Dollar. It ensures your earnings and deposits remain stable, secure, and protected from the price fluctuations common in other digital currencies.',
      icon: <DollarSign size={20} className="text-pink-400" />
    },
    {
      id: 'referrals',
      question: 'Why do I need referrals?',
      answer: 'Referrals help expand our shared cloud computing network to more participants. By inviting others, you help build a larger, more powerful computer network. We reward this growth by increasing your trust score and giving you direct bonuses.',
      icon: <Users size={20} className="text-cyan-400" />
    },
    {
      id: 'safety',
      question: 'Is my money safe?',
      answer: 'Yes. All transactions are logged securely in our double-entry ledger system. We maintain full transparency, and your funds are protected by the platform\'s safety guidelines and battle-tested protocols.',
      icon: <ShieldCheck size={20} className="text-emerald-400" />
    },
    {
      id: 'account_loss',
      question: 'Can I lose my account?',
      answer: 'Your account is safe as long as you follow the platform rules. Engaging in fraud, exploiting bugs, or creating fake referral accounts will lead to permanent suspension. We keep our community clean to protect honest users.',
      icon: <ShieldCheck size={20} className="text-red-400" />
    },
    {
      id: 'timing',
      question: 'How long do payments take?',
      answer: 'Both deposits and withdrawals are processed in real-time. Mobile money transfers and crypto payouts usually complete within seconds. In rare cases of network congestion, it may take up to a few minutes to settle.',
      icon: <Clock size={20} className="text-amber-500" />
    },
    {
      id: 'limits',
      question: 'Why are there limits?',
      answer: 'Limits protect the network\'s liquidity and ensure fair distribution among all users. As your verified platform reputation grows, your transaction limits naturally expand, allowing you to run larger operations.',
      icon: <TrendingUp size={20} className="text-cyan-500" />
    },
    {
      id: 'why_learn',
      question: 'Why do I need to learn before I start?',
      answer: 'We want every user to understand the real value of the cloud computing economy. Learning the basics builds confidence, removes fear, and helps you make smarter decisions as you scale your participation.',
      icon: <HelpCircle size={20} className="text-indigo-500" />
    },
    {
      id: 'balance_calc',
      question: 'How is my balance calculated?',
      answer: 'Your balance updates continuously based on the Compute Power of your active Machines. The system calculates your share of rental fees every second and adds it directly to your available balance.',
      icon: <DollarSign size={20} className="text-purple-500" />
    },
    {
      id: 'platform_fee',
      question: 'How does TitanStream make money?',
      answer: 'TitanStream acts as the platform orchestrator. We take a small service fee from the rental contracts paid by businesses to cover data center maintenance, electricity, and platform operations.',
      icon: <Server size={20} className="text-gray-400" />
    },
    {
      id: 'why_growth',
      question: 'Why is cloud computing growing so fast?',
      answer: 'The entire world is moving online. From AI models to video rendering, automation, and science, businesses need more power than ever. Industry giants like Amazon, Microsoft, and NVIDIA rely heavily on cloud computing, making it a trillion-dollar industry.',
      icon: <TrendingUp size={20} className="text-teal-400" />
    }
  ];

  const toggleExpand = (id: string) => {
    hapticFeedback.selectionChanged();
    setExpandedId(expandedId === id ? null : id);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          className="w-full max-w-md bg-app-bg border border-white/10 rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-usdt-green/20 text-usdt-green flex items-center justify-center">
                <HelpCircle size={18} />
              </div>
              <h2 className="text-base font-extrabold text-text-primary">Education & FAQ</h2>
            </div>
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

          {/* Introduction */}
          <div className="bg-control-bg/30 border border-white/5 rounded-2xl p-4 mb-4">
            <p className="text-xs text-text-secondary leading-relaxed font-medium">
              TitanStream is your portal to the growing cloud computing economy. 
              By joining together, we secure high-performance computing capacity that businesses rent daily. 
              Enjoy secure payouts in real-time.
            </p>
          </div>

          {/* FAQ Items */}
          <div className="space-y-2">
            {faqItems.map((item) => (
              <div
                key={item.id}
                className="glass-panel rounded-xl border border-white/10 overflow-hidden"
              >
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-control-bg border border-white/5 flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <span className="text-xs font-extrabold text-text-primary">{item.question}</span>
                  </div>
                  {expandedId === item.id ? (
                    <ChevronUp size={16} className="text-text-secondary flex-shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-text-secondary flex-shrink-0" />
                  )}
                </button>

                <AnimatePresence>
                  {expandedId === item.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-3 pt-0 text-xs text-text-secondary leading-relaxed border-t border-white/5">
                        {item.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-white/5 space-y-2 text-center">
            <button
              onClick={() => {
                hapticFeedback.impactOccurred('medium');
                const subject = prompt('Brief description of your issue:', 'Deposit / Machine Inquiry');
                if (!subject) return;
                const details = prompt('Details for support operator:');
                if (!details) return;

                const user = useTelegram().user;
                useSupportStore.getState().createTicket(
                  {
                    userTelegramId: user?.id?.toString() || '74829103',
                    userName: user?.first_name || 'TitanStream User',
                    userUsername: user?.username ? `@${user.username}` : '@user',
                    userCountry: 'Uganda',
                    userBalanceUsdt: useWalletStore.getState().usdtBalance,
                    category: 'Funding',
                    priority: 'Normal',
                    status: 'Waiting for Admin',
                    subject,
                    runningMachinesCount: 1,
                  },
                  details
                );
                alert('Support ticket created! Admin operator will reply via Telegram Bot.');
                onClose();
              }}
              className="press-feedback w-full py-2.5 rounded-xl bg-usdt-green text-app-bg font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md"
            >
              <Headphones size={14} /> Contact Support Operator
            </button>
            <p className="text-[10px] text-text-tertiary">
              24/7 Support Desk — Replies sync directly to your Telegram chat.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
