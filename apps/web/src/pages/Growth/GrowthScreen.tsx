import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Award,
  Users,
  Gift,
  Copy,
  Check,
  Share2,
  ChevronRight,
  Sparkles,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle2,
  Lock,
  Unlock,
  DollarSign,
  Calendar,
  Activity
} from 'lucide-react';
import { useGrowthStore } from '../../store/useGrowthStore';
import { useTelegram } from '../../context/TelegramContext';
import { useQuestStore, type QuestItem } from '../../store/useQuestStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useNavigationStore } from '../../store/useNavigationStore';
import { useTreasuryStore } from '../../store/useTreasuryStore';
import { useMiningStore } from '../../store/useMiningStore';
import { CurrencyDisplay } from '../../components/DualCurrencyDisplay';
import { showToast } from '../../components/Toast';

export const GrowthScreen: React.FC = () => {
  const { hasPurchasedMachine, baseSpeedGhs, unclaimedBalance } = useMiningStore();
  const { profile, referrals, rewards, qualification, isLoading, fetchGrowthProfile, fetchReferrals, fetchRewards, fetchQualification } = useGrowthStore();
  const { hapticFeedback, webApp } = useTelegram();
  const [activeTab, setActiveTab] = useState<'trust' | 'referrals' | 'rewards'>('trust');
  const [copied, setCopied] = useState(false);
  const [showPayoutHistory, setShowPayoutHistory] = useState(false);

  // Live trust score from Treasury Store
  const liveTrustScore = useTreasuryStore((s) => s.trustScore);

  // Quest Store and relevant actions
  const {
    quests,
    activeTab: questTab,
    activeCategory: questCategory,
    setActiveTab: setQuestTab,
    setActiveCategory: setQuestCategory,
    claimQuest,
    incrementProgress,
  } = useQuestStore();

  const { oursCount, partnerCount, decrementBadge } = useNotificationStore();
  const { crystalsBalance, updateBalance } = useWalletStore();
  const { openGames } = useNavigationStore();
  const { events: communityEvents } = useTreasuryStore();

  const categories = [
    'All ours',
    'Daily login',
    'Friends',
    'Taps',
    'Home screen',
    'Stories',
    'Achievements',
    'Games',
  ];

  const filteredQuests = quests.filter((q) => {
    if (q.type !== questTab) return false;
    if (questCategory === 'All ours' || questCategory === 'Partner') return true;
    return q.category.toLowerCase() === questCategory.toLowerCase();
  });

  const handleQuestClaim = (quest: QuestItem) => {
    hapticFeedback.impactOccurred('medium');
    updateBalance({ crystalsBalance: crystalsBalance + quest.rewardValue });
    claimQuest(quest.id);
    decrementBadge(quest.type);
    useTreasuryStore.getState().adjustTrustScore(2);
    showToast(`Claimed +${quest.rewardValue} Crystals & +2 Trust Score!`, 'success');
  };

  const handleQuestAction = (quest: QuestItem) => {
    hapticFeedback.selectionChanged();
    if (quest.actionLabel === 'Play') {
      openGames();
      showToast('Opening Mini-Games lobby...', 'info');
    } else if (quest.actionLabel === 'Add') {
      incrementProgress(quest.id, 1);
      showToast('Shortcut successfully added to Home Screen!', 'success');
      useTreasuryStore.getState().adjustTrustScore(1);
    } else if (quest.actionLabel === 'Post story') {
      incrementProgress(quest.id, 1);
      showToast('Story successfully shared on Telegram!', 'success');
      useTreasuryStore.getState().adjustTrustScore(1);
    } else if (quest.externalUrl) {
      window.open(quest.externalUrl, '_blank');
      incrementProgress(quest.id, 1);
      showToast('Task opened! Return to claim your reward.', 'success');
    } else {
      showToast(`Executing ${quest.actionLabel || 'task'}...`, 'info');
    }
  };

  useEffect(() => {
    fetchGrowthProfile();
    fetchReferrals();
    fetchRewards();
    fetchQualification();
  }, [fetchGrowthProfile, fetchReferrals, fetchRewards, fetchQualification]);

  const handleCopyLink = () => {
    if (!profile?.referrals.link) return;
    navigator.clipboard.writeText(profile.referrals.link);
    hapticFeedback.notificationOccurred('success');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTelegram = () => {
    if (!profile?.referrals.link) return;
    hapticFeedback.impactOccurred('medium');
    const text = encodeURIComponent(
      `Join me on TitanStream to earn and settle USDT instantly with zero friction! Use my referral code: ${profile.referrals.code}`,
    );
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(profile.referrals.link)}&text=${text}`;
    if (webApp?.openTelegramLink) {
      webApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  const getLevelColor = (level?: string) => {
    switch (level) {
      case 'ELITE':
        return 'from-amber-400 to-yellow-500 text-amber-950 border-amber-300';
      case 'PREMIUM':
        return 'from-purple-500 to-indigo-600 text-white border-purple-400';
      case 'TRUSTED':
        return 'from-usdt-green to-emerald-600 text-app-bg border-usdt-green';
      case 'VERIFIED':
        return 'from-sky-500 to-blue-600 text-white border-sky-400';
      default:
        return 'from-gray-600 to-gray-700 text-gray-200 border-gray-500';
    }
  };

  return (
    <div className="w-full pb-24 pt-4 px-4 space-y-5 select-none max-w-lg mx-auto">
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-text-primary tracking-tight">Trust & Growth Hub</h1>
          <p className="text-xs text-text-tertiary">Build your reputation, unlock perks & earn USDT</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-usdt-green/15 border border-usdt-green/30 text-usdt-green flex items-center justify-center font-bold">
          <Award size={22} />
        </div>
      </div>

      {/* Daily Loop & Platform Brain Decision Engine */}
      <div className="glass-panel p-4.5 rounded-3xl border border-usdt-green/30 bg-gradient-to-br from-usdt-green/10 via-card-bg to-control-bg/60 space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm">☀️</span>
            <span className="text-xs font-black text-text-primary">Today's Daily Cloud Loop</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-usdt-green bg-usdt-green/20 px-2 py-0.5 rounded-full border border-usdt-green/30">
            Active Stream
          </span>
        </div>

        {/* Daily Cloud Status */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-2xl bg-app-bg/50 border border-white/5 space-y-0.5">
            <div className="text-[10px] text-text-tertiary font-bold">Active Computing Capacity</div>
            <div className="font-mono font-extrabold text-usdt-green flex items-center gap-1">
              <CheckCircle2 size={12} />
              <span>{hasPurchasedMachine ? `${(baseSpeedGhs * 10).toFixed(0)} CU Active` : 'Free Trial Node (10 CU)'}</span>
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-app-bg/50 border border-white/5 space-y-0.5">
            <div className="text-[10px] text-text-tertiary font-bold font-sans">Accumulated Yield</div>
            <div className="font-mono font-extrabold text-text-primary flex items-center gap-1">
              <CheckCircle2 size={12} className="text-usdt-green" />
              <CurrencyDisplay amount={unclaimedBalance + (Number(usdtBalance) || 0)} size="sm" />
            </div>
          </div>
        </div>

        {/* Platform Brain — Recommender System Opportunities */}
        <div className="p-3 rounded-2xl bg-usdt-green/15 border border-usdt-green/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-usdt-green uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={13} /> Platform Brain Recommendation
            </span>
            <span className="text-[9px] font-mono text-text-tertiary">Next Best Action</span>
          </div>
          <div className="space-y-1.5 text-xs text-text-primary font-medium">
            <div className="flex items-center justify-between bg-black/20 p-2 rounded-xl">
              <span>• Complete today's cloud snapshot</span>
              <span className="text-[10px] font-bold text-usdt-green">+💎 Crystals</span>
            </div>
            <div className="flex items-center justify-between bg-black/20 p-2 rounded-xl">
              <span>• Invite 1 friend to network</span>
              <span className="text-[10px] font-bold text-amber-400">+$5.00 USDT</span>
            </div>
            <div className="flex items-center justify-between bg-black/20 p-2 rounded-xl">
              <span>• Upgrade your Machine to Pro Unit</span>
              <span className="text-[10px] font-bold text-sky-300">Boost Hashrate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-control-bg rounded-2xl border border-white/10 text-xs font-bold">
        {[
          { key: 'trust', label: 'Trust & Level', icon: ShieldCheck },
          { key: 'referrals', label: 'Referrals', icon: Users },
          { key: 'rewards', label: 'Quests', icon: Gift },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                hapticFeedback.selectionChanged();
                setActiveTab(tab.key as any);
              }}
              className={`press-feedback py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                isActive
                  ? 'bg-usdt-green text-app-bg font-extrabold shadow-md'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Loading Skeletons */}
      {isLoading && !profile ? (
        <div className="glass-panel p-6 rounded-3xl animate-pulse space-y-4">
          <div className="h-20 bg-white/5 rounded-2xl" />
          <div className="h-12 bg-white/5 rounded-xl" />
          <div className="h-32 bg-white/5 rounded-2xl" />
        </div>
      ) : (
        <>
          {/* TAB 1: TRUST & LEVEL */}
          {activeTab === 'trust' && (
            <div className="space-y-4">
              {/* Trust Score Hero Card */}
              <div className="glass-panel p-5 rounded-3xl border border-white/10 relative overflow-hidden space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={20} className="text-usdt-green" />
                    <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-text-tertiary">
                      Reputation Profile
                    </span>
                  </div>

                  {/* Level Pill */}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r ${getLevelColor(
                      profile?.level,
                    )} shadow-md border`}
                  >
                    {profile?.levelName || profile?.level || 'NEW'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <div className="text-4xl font-black font-mono text-text-primary tracking-tight">
                      {liveTrustScore}%
                    </div>
                    <div className="text-xs font-semibold text-usdt-green mt-0.5 flex items-center gap-1">
                      <TrendingUp size={13} />
                      <span>Verified Platform Reputation</span>
                    </div>
                  </div>

                  {/* Visual Radial Ring */}
                  <div className="w-16 h-16 rounded-full border-4 border-usdt-green/30 border-t-usdt-green flex items-center justify-center font-mono font-bold text-xs text-usdt-green bg-usdt-green/10">
                    {liveTrustScore} / 100
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-center text-xs">
                  <div className="p-2 rounded-xl bg-white/5">
                    <div className="text-text-tertiary text-[10px] uppercase font-bold">Settlements</div>
                    <div className="font-mono font-extrabold text-text-primary text-sm mt-0.5">
                      {profile?.completedSettlements || 0}
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5">
                    <div className="text-text-tertiary text-[10px] uppercase font-bold">Account Age</div>
                    <div className="font-mono font-extrabold text-text-primary text-sm mt-0.5">
                      {profile?.accountAgeDays || 0}d
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5">
                    <div className="text-text-tertiary text-[10px] uppercase font-bold">Total Volume</div>
                    <div className="font-mono font-extrabold text-usdt-green text-sm mt-0.5">
                      ${(Number(profile?.totalVolumeUSDT) || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Level Benefits unlocked */}
              <div className="glass-panel p-4 rounded-3xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-text-tertiary uppercase tracking-wider">
                    Unlocked Benefits ({profile?.levelName})
                  </h3>
                  <Sparkles size={16} className="text-amber-400" />
                </div>

                <div className="space-y-2">
                  {(profile?.benefits || []).map((benefit, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-usdt-green/10 border border-usdt-green/20 flex items-center gap-3 text-xs text-text-primary font-semibold"
                    >
                      <CheckCircle2 size={16} className="text-usdt-green shrink-0" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress to Next Tier */}
              {profile?.nextLevel && (
                <div className="glass-panel p-4 rounded-3xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-text-primary">Next Tier Progress:</span>
                    <span className="font-extrabold text-amber-400 font-mono">{profile.nextLevel.name}</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-text-tertiary">
                      <span>Trust Score Required:</span>
                      <span className="font-mono text-text-primary">{liveTrustScore} / {profile.nextLevel.minTrustScore}</span>
                    </div>
                    <div className="w-full bg-control-bg h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-usdt-green h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            (liveTrustScore / (profile.nextLevel.minTrustScore || 100)) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REFERRALS */}
          {activeTab === 'referrals' && (
            <div className="space-y-4">
              {/* Referral Share Widget */}
              <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4 bg-gradient-to-b from-usdt-green/10 to-transparent">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-text-primary">Telegram Referral Link</h3>
                    <p className="text-xs text-text-tertiary">Earn 5 USDT per qualified referral!</p>
                  </div>
                  <Users size={20} className="text-usdt-green" />
                </div>

                {/* Link Box */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-control-bg border border-white/10 font-mono text-xs text-text-primary">
                  <span className="truncate pr-2">{profile?.referrals?.link || 'Generating code...'}</span>
                  <button
                    onClick={handleCopyLink}
                    className="press-feedback p-2 rounded-xl bg-usdt-green/20 text-usdt-green hover:bg-usdt-green/30"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>

                {/* Share CTAs */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleShareTelegram}
                    className="press-feedback py-3 rounded-xl bg-usdt-green text-app-bg font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-usdt-green/20"
                  >
                    <Share2 size={15} />
                    <span>Share to Telegram</span>
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="press-feedback py-3 rounded-xl bg-white/5 border border-white/10 text-text-secondary hover:text-text-primary font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    {copied ? <Check size={15} className="text-usdt-green" /> : <Copy size={15} />}
                    <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
              </div>

              {/* Referral Stats Grid */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="glass-panel p-3 rounded-2xl border border-white/10">
                  <div className="text-text-tertiary text-[10px] font-bold uppercase">Invited</div>
                  <div className="font-mono font-black text-text-primary text-base mt-1">
                    {referrals?.totalInvited || 0}
                  </div>
                </div>
                <div className="glass-panel p-3 rounded-2xl border border-white/10">
                  <div className="text-text-tertiary text-[10px] font-bold uppercase">Earned USDT</div>
                  <div className="font-mono font-black text-amber-400 text-base mt-1">
                    ${referrals?.totalEarnedUSDT || 0}
                  </div>
                </div>
                <div className="glass-panel p-3 rounded-2xl border border-white/10">
                  <div className="text-text-tertiary text-[10px] font-bold uppercase">Qualified</div>
                  <div className="font-mono font-black text-usdt-green text-base mt-1">
                    {referrals?.qualifiedCount || 0}
                  </div>
                </div>
                <div className="glass-panel p-3 rounded-2xl border border-white/10">
                  <div className="text-text-tertiary text-[10px] font-bold uppercase">Paying</div>
                  <div className="font-mono font-black text-sky-400 text-base mt-1">
                    {referrals?.payingCount ?? qualification?.payingReferrals ?? 0}
                  </div>
                </div>
              </div>

              {/* Qualification Progress */}
              <div className="space-y-3">
                <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {qualification?.withdrawal.canWithdraw
                        ? <Unlock size={16} className="text-usdt-green" />
                        : <Lock size={16} className="text-amber-400" />
                      }
                      <h4 className="text-xs font-extrabold text-text-primary">Withdrawal Unlock</h4>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      qualification?.withdrawal.canWithdraw
                        ? 'bg-usdt-green/20 text-usdt-green'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {qualification?.withdrawal.qualifiedCount || 0}/{qualification?.withdrawal.requirement || 5}
                    </span>
                  </div>
                  <div className="w-full bg-control-bg h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        qualification?.withdrawal.canWithdraw ? 'bg-usdt-green' : 'bg-amber-400'
                      }`}
                      style={{ width: `${qualification?.withdrawal.progressPercent || 0}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-text-tertiary">
                    {qualification?.withdrawal.canWithdraw
                      ? 'Withdrawals are unlocked. You can withdraw your USDT.'
                      : `Need ${qualification?.withdrawal.remainingNeeded || 5} more qualified referral${(qualification?.withdrawal.remainingNeeded || 5) !== 1 ? 's' : ''} to unlock withdrawals.`
                    }
                  </p>
                </div>

                <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {qualification?.discount.canAccessDiscounts
                        ? <DollarSign size={16} className="text-usdt-green" />
                        : <Lock size={16} className="text-purple-400" />
                      }
                      <h4 className="text-xs font-extrabold text-text-primary">Discount Unlock</h4>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      qualification?.discount.canAccessDiscounts
                        ? 'bg-usdt-green/20 text-usdt-green'
                        : 'bg-purple-500/20 text-purple-300'
                    }`}>
                      {qualification?.discount.payingCount || 0}/{qualification?.discount.requirement || 5}
                    </span>
                  </div>
                  <div className="w-full bg-control-bg h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        qualification?.discount.canAccessDiscounts ? 'bg-usdt-green' : 'bg-purple-400'
                      }`}
                      style={{ width: `${qualification?.discount.progressPercent || 0}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-text-tertiary">
                    {qualification?.discount.canAccessDiscounts
                      ? 'Discounted offer rates are unlocked!'
                      : `Need ${qualification?.discount.payingRemaining || 5} more paying referral${(qualification?.discount.payingRemaining || 5) !== 1 ? 's' : ''} to unlock discounts.`
                    }
                  </p>
                </div>
              </div>

              {/* Referee List */}
              <div className="glass-panel p-4 rounded-3xl border border-white/10 space-y-3">
                <h4 className="text-xs font-extrabold text-text-tertiary uppercase tracking-wider">
                  Referred Friends ({referrals?.referrals.length || 0})
                </h4>

                {referrals?.referrals.length === 0 ? (
                  <div className="py-8 text-center text-xs text-text-tertiary space-y-2">
                    <Users size={28} className="mx-auto text-text-tertiary/50" />
                    <p>No referrals yet. Share your link to start earning!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {referrals?.referrals.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-extrabold text-text-primary">{item.refereeName}</div>
                          <div className="text-[11px] text-text-tertiary font-mono">
                            Joined {new Date(item.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold font-mono uppercase ${
                            item.status === 'REWARDED' || item.status === 'QUALIFIED'
                              ? 'bg-usdt-green/20 text-usdt-green border border-usdt-green/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: QUESTS, EVENTS & REWARDS */}
          {activeTab === 'rewards' && (
            <div className="space-y-5">
              {/* 1. Community Events */}
              {communityEvents.length > 0 && (
                <div className="glass-panel p-4.5 rounded-3xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h4 className="text-xs font-black uppercase text-text-secondary tracking-widest flex items-center gap-1.5">
                      <Calendar size={14} className="text-usdt-green" /> Community Events
                    </h4>
                    <span className="text-[10px] text-text-tertiary font-mono">
                      {communityEvents.length} Active
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {communityEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="p-3 rounded-xl bg-control-bg/40 border border-white/5 flex items-center justify-between text-xs transition-all hover:border-usdt-green/30"
                      >
                        <div className="flex flex-col gap-0.5 max-w-[70%]">
                          <span className="font-extrabold text-text-primary">{evt.title}</span>
                          <span className="text-[10px] text-text-tertiary leading-relaxed">{evt.description}</span>
                        </div>
                        {evt.badge && (
                          <span className="text-[8px] font-bold text-usdt-green bg-usdt-green/10 border border-usdt-green/20 px-2 py-0.5 rounded-full uppercase shrink-0">
                            {evt.badge}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Quests Section */}
              <div className="glass-panel p-4.5 rounded-3xl border border-white/10 space-y-4">
                {/* Ours vs Partner Tabs */}
                <div className="bg-control-bg p-1 rounded-2xl flex items-center border border-white/5 relative">
                  <button
                    onClick={() => {
                      hapticFeedback.selectionChanged();
                      setQuestTab('OURS');
                    }}
                    className={`
                      relative flex-1 py-2 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 press-feedback transition-all z-10
                      ${questTab === 'OURS' ? 'text-usdt-green font-black' : 'text-text-secondary'}
                    `}
                  >
                    {questTab === 'OURS' && (
                      <motion.div
                        layoutId="growthQuestSegmentTab"
                        className="absolute inset-0 bg-usdt-green/15 border border-usdt-green/30 rounded-xl"
                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      />
                    )}
                    <span className="relative z-10">Ours</span>
                    <span className="relative z-10 bg-usdt-green/20 text-usdt-green text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full">
                      {oursCount}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      hapticFeedback.selectionChanged();
                      setQuestTab('PARTNER');
                    }}
                    className={`
                      relative flex-1 py-2 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 press-feedback transition-all z-10
                      ${questTab === 'PARTNER' ? 'text-usdt-green font-black' : 'text-text-secondary'}
                    `}
                  >
                    {questTab === 'PARTNER' && (
                      <motion.div
                        layoutId="growthQuestSegmentTab"
                        className="absolute inset-0 bg-usdt-green/15 border border-usdt-green/30 rounded-xl"
                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      />
                    )}
                    <span className="relative z-10">Partner</span>
                    <span className="relative z-10 bg-control-bg text-text-secondary text-[9px] font-mono px-1.5 py-0.5 rounded-full border border-white/5">
                      {partnerCount}
                    </span>
                  </button>
                </div>

                {/* Categories Carousel */}
                {questTab === 'OURS' && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {categories.map((cat) => {
                      const isActive = questCategory === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            hapticFeedback.selectionChanged();
                            setQuestCategory(cat);
                          }}
                          className={`
                            px-3 py-1.5 rounded-xl text-[10px] font-extrabold whitespace-nowrap press-feedback transition-all
                            ${isActive
                              ? 'bg-usdt-green/20 border border-usdt-green/30 text-usdt-green'
                              : 'bg-control-bg/60 text-text-secondary hover:text-text-primary border border-white/5'
                            }
                          `}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Quests Cards List */}
                <div className="flex flex-col gap-2.5">
                  {filteredQuests.length === 0 ? (
                    <div className="py-6 text-center text-xs text-text-tertiary">
                      No quests active in this category
                    </div>
                  ) : (
                    filteredQuests.map((quest) => {
                      const isClaimable = quest.status === 'CLAIMABLE';
                      const isComplete = quest.status === 'CLAIMED';

                      return (
                        <div
                          key={quest.id}
                          className={`p-3.5 rounded-2xl border flex flex-col gap-3 transition-all ${
                            isClaimable
                              ? 'border-usdt-green/35 bg-gradient-to-b from-control-bg/50 to-usdt-green/5'
                              : 'border-white/5 bg-control-bg/30'
                          }`}
                        >
                          {/* Top row info */}
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-control-bg border border-white/5 flex items-center justify-center text-base shrink-0">
                                {quest.category === 'Games' ? '🎮' : '💎'}
                              </div>
                              <div className="min-w-0">
                                <h5 className="text-xs font-black text-text-primary truncate">{quest.title}</h5>
                                <p className="text-[10px] text-text-secondary mt-0.5 leading-normal">{quest.subtitle}</p>
                              </div>
                            </div>

                            {isClaimable && (
                              <span className="text-[9px] font-black text-usdt-green bg-usdt-green/10 px-2 py-0.5 rounded-full border border-usdt-green/20 animate-pulse">
                                READY
                              </span>
                            )}
                          </div>

                          {/* Target progress */}
                          {quest.target > 1 && (
                            <div className="flex flex-col gap-1 text-[10px] text-text-tertiary">
                              <div className="flex justify-between font-mono">
                                <span>Progress</span>
                                <span className="font-bold text-text-secondary">{quest.progress} / {quest.target}</span>
                              </div>
                              <div className="w-full h-1.5 bg-control-bg rounded-full overflow-hidden p-0.5 border border-white/5">
                                <div
                                  className="h-full bg-usdt-green rounded-full transition-all duration-300"
                                  style={{ width: `${(quest.progress / quest.target) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Reward details + Action button */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-white/5">
                            <div className="bg-control-bg/60 border border-white/5 rounded-full px-2 py-0.5 text-[10px] font-bold text-text-primary flex items-center gap-1 font-mono">
                              <span>+</span>
                              <span className="text-crystals-blue">💎</span>
                              <span>{quest.rewardValue}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {!isComplete && (quest.actionLabel || quest.externalUrl) && (
                                <button
                                  onClick={() => handleQuestAction(quest)}
                                  className="press-feedback bg-control-bg text-text-primary font-bold text-[10px] px-3 py-1.5 rounded-xl border border-white/5 hover:bg-border"
                                >
                                  {quest.actionLabel || 'Go'}
                                </button>
                              )}

                              <button
                                disabled={!isClaimable || isComplete}
                                onClick={() => handleQuestClaim(quest)}
                                className={`
                                  press-feedback font-extrabold text-[10px] px-4 py-2 rounded-xl transition-all
                                  ${isClaimable
                                    ? 'bg-usdt-green text-app-bg hover:brightness-110 shadow-md shadow-usdt-green/15'
                                    : 'bg-control-bg/50 text-text-tertiary border border-white/5 cursor-not-allowed'
                                  }
                                `}
                              >
                                {isComplete ? 'Claimed' : 'Claim'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 3. Collapsible Payouts History */}
              <div className="pt-1">
                <button
                  onClick={() => {
                    hapticFeedback.impactOccurred('light');
                    setShowPayoutHistory(!showPayoutHistory);
                  }}
                  className="w-full p-3.5 rounded-2xl bg-control-bg/40 border border-white/5 flex items-center justify-between text-xs font-bold text-text-secondary hover:text-text-primary transition-all hover:bg-control-bg/65"
                >
                  <span className="flex items-center gap-2">
                    <Activity size={14} className="text-amber-400" />
                    <span>Payout & Reward History</span>
                  </span>
                  <ChevronRight size={15} className={`transition-transform duration-200 ${showPayoutHistory ? 'rotate-90' : ''}`} />
                </button>

                <AnimatePresence>
                  {showPayoutHistory && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-2 space-y-2"
                    >
                      {rewards.length === 0 ? (
                        <div className="py-8 text-center text-xs text-text-tertiary bg-control-bg/10 rounded-2xl border border-white/5">
                          No payout history recorded.
                        </div>
                      ) : (
                        rewards.map((reward) => (
                          <div
                            key={reward.id}
                            className="p-3 rounded-xl bg-control-bg/30 border border-white/5 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-usdt-green/10 text-usdt-green flex items-center justify-center font-bold text-[10px]">
                                ₮
                              </div>
                              <div>
                                <div className="font-extrabold text-[11px] text-text-primary">{reward.rewardType} BONUS</div>
                                <div className="text-[9px] font-mono text-text-tertiary">
                                  {new Date(reward.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="font-mono font-extrabold text-usdt-green text-[11px]">
                                +{reward.amount} {reward.assetCode}
                              </div>
                              <span className="text-[9px] text-text-tertiary block mt-0.5 uppercase font-bold">{reward.status}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
