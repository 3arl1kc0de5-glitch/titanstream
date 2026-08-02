import type React from 'react';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useReferralStore } from '../../store/useReferralStore';
import { showToast } from '../../components/Toast';
import { Copy, Share2, Users, Flame, Star, Award, Gift, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { EducationCard } from '../../components/EducationCard';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  REGISTERED:  { label: 'Registered',  color: 'text-text-secondary',  icon: <Clock size={10} /> },
  ONBOARDED:   { label: 'Onboarded',   color: 'text-ton-blue',        icon: <CheckCircle size={10} /> },
  QUALIFIED:   { label: 'Qualified',   color: 'text-usdt-green',      icon: <CheckCircle size={10} /> },
  PAYING:      { label: 'Paying',      color: 'text-usdt-green',      icon: <CheckCircle size={10} /> },
  REWARDED:    { label: 'Rewarded',    color: 'text-gold',            icon: <CheckCircle size={10} /> },
  CREATED:     { label: 'Invited',     color: 'text-text-tertiary',   icon: <AlertCircle size={10} /> },
};

const getInitial = (name?: string) => (name || '?')[0].toUpperCase();

export const FriendsScreen: React.FC = () => {
  const {
    invitedCount,
    computeBoost,
    earnedUsdt,
    referralLink,
    referralCode,
    referredBy,
    referrals,
    isLoading,
    fetchReferrals,
  } = useReferralStore();

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    showToast('Referral link copied!', 'success');
  };

  const handleShare = () => {
    if (!referralLink) return;
    const tg = window.Telegram?.WebApp;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join TitanStream — earn USDT 24/7 with instant mobile money settlements! 🚀')}`;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  return (
    <div className="p-5 flex flex-col gap-6 relative z-10">
      {/* Progressive Education: Referral */}
      <EducationCard
        educationKey="referral"
        title="Contextual Referrals"
        body="Invite friends to TitanStream and earn 5 USDT for every friend who completes their first deposit. No limits, no thresholds."
        icon={<Gift size={18} />}
      />

      {/* Title Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-1"
      >
        <div className="text-[10px] font-extrabold tracking-widest text-usdt-green uppercase bg-usdt-green/10 px-2.5 py-1 rounded-full w-max border border-usdt-green/20">
          Referrals program
        </div>
        <h1 className="text-3xl font-extrabold text-text-primary mt-1.5 tracking-tight">Friends</h1>
        <p className="text-xs text-text-secondary leading-relaxed">
          Invite friends to TitanStream. Earn 5 USDT for every qualified referral who completes their first settlement.
        </p>
      </motion.div>

      {/* Stats Dashboard Grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="web3-card rounded-2xl p-4.5 grid grid-cols-2 gap-4 relative overflow-hidden"
      >
        {/* Invited */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-extrabold text-text-tertiary uppercase tracking-wider">Invited</span>
          <div className="flex items-baseline gap-1 mt-1">
            {isLoading ? (
              <span className="text-2xl font-black text-text-primary font-mono animate-pulse">—</span>
            ) : (
              <span className="text-2xl font-black text-text-primary font-mono">{invitedCount}</span>
            )}
            <span className="text-[10px] font-bold text-text-secondary">friends</span>
          </div>
        </div>

        {/* Referral Code */}
        <div className="flex flex-col gap-0.5 border-l border-white/5 pl-4">
          <span className="text-[10px] font-extrabold text-text-tertiary uppercase tracking-wider">Your Code</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-base font-black text-gradient-neon font-mono tracking-widest">
              {referralCode || '—'}
            </span>
          </div>
        </div>

        {/* Earned USDT */}
        <div className="flex flex-col gap-0.5 border-t border-white/5 pt-4">
          <span className="text-[10px] font-extrabold text-text-tertiary uppercase tracking-wider">Earned USDT</span>
          <div className="flex items-center gap-1.5 mt-1 font-mono">
            <span className="text-sm font-extrabold text-usdt-green">₮</span>
            {isLoading ? (
              <span className="text-lg font-black text-text-primary animate-pulse">—</span>
            ) : (
              <span className="text-lg font-black text-text-primary">{earnedUsdt.toFixed(2)}</span>
            )}
          </div>
        </div>

        {/* Boost */}
        <div className="flex flex-col gap-0.5 border-t border-white/5 pt-4 border-l pl-4">
          <span className="text-[10px] font-extrabold text-text-tertiary uppercase tracking-wider">Boost</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-gradient-neon font-mono">×{computeBoost.toFixed(2)}</span>
          </div>
        </div>
      </motion.div>

      {/* Referral Link Box */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col gap-2.5"
      >
        <span className="text-xs font-bold text-text-secondary pl-0.5">Your Referral Link</span>
        <div className="flex items-center gap-2 bg-control-bg rounded-xl p-1 border border-white/5 shadow-inner">
          <span className="flex-1 text-xs text-text-tertiary font-mono truncate px-3 py-2">
            {isLoading ? 'Loading...' : (referralLink || 'Generating your link...')}
          </span>
          <button
            onClick={handleCopy}
            disabled={!referralLink}
            className="press-feedback bg-white/5 border border-white/10 hover:bg-white/10 text-usdt-green font-extrabold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40"
          >
            <Copy size={13} />
            Copy
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-1">
          <button
            onClick={handleCopy}
            disabled={!referralLink}
            className="press-feedback btn-glossy-secondary py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-40"
          >
            <Copy size={16} />
            Copy Link
          </button>
          <button
            onClick={handleShare}
            disabled={!referralLink}
            className="press-feedback btn-glossy-primary py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-[0_4px_20px_rgba(0,255,135,0.3)] disabled:opacity-40"
          >
            <Share2 size={16} />
            Share Link
          </button>
        </div>
      </motion.div>

      {/* Who Referred Me */}
      {referredBy && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="web3-card rounded-xl p-4 border border-usdt-green/15 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-full bg-usdt-green/10 border border-usdt-green/20 flex items-center justify-center text-sm font-bold text-usdt-green flex-shrink-0">
            {getInitial(referredBy.username || referredBy.name)}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[10px] font-extrabold text-text-tertiary uppercase tracking-wider">Referred by</span>
            <span className="text-xs font-extrabold text-text-primary truncate">
              {referredBy.username ? `@${referredBy.username}` : referredBy.name}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] text-usdt-green font-bold">Active</span>
          </div>
        </motion.div>
      )}

      {/* What You Earn */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col gap-3.5"
      >
        <h2 className="text-xs font-black text-text-tertiary tracking-widest uppercase">What You Earn</h2>
        <div className="flex flex-col gap-3">
          <div className="web3-card rounded-xl p-3.5 flex items-center gap-3.5 border border-white/5 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-usdt-green/15 border border-usdt-green/30 text-usdt-green flex items-center justify-center shadow-[0_0_15px_rgba(0,230,118,0.15)] flex-shrink-0">
              <Flame size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-extrabold text-text-primary">5 USDT per qualified referral</span>
              <span className="text-[11px] text-text-secondary mt-0.5">Credited instantly when your friend completes their first deposit</span>
            </div>
          </div>

          <div className="web3-card rounded-xl p-3.5 flex items-center gap-3.5 border border-white/5 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-ton-blue/15 border border-ton-blue/30 text-ton-blue flex items-center justify-center shadow-[0_0_15px_rgba(0,136,204,0.15)] flex-shrink-0">
              <Star size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-extrabold text-text-primary">Compute capacity boost</span>
              <span className="text-[11px] text-text-secondary mt-0.5">Your stream capacity grows with each friend you bring in</span>
            </div>
          </div>

          <div className="web3-card rounded-xl p-3.5 flex items-center gap-3.5 border border-white/5 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 text-gold flex items-center justify-center shadow-[0_0_15px_rgba(255,179,0,0.15)] flex-shrink-0">
              <Award size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-extrabold text-text-primary">Unlock higher trust levels</span>
              <span className="text-[11px] text-text-secondary mt-0.5">More referrals = higher tier = better limits & features</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Your Referrals List */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-text-primary">Your Referrals</h2>
          <span className="text-xs font-mono text-text-tertiary bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
            {invitedCount} {invitedCount === 1 ? 'friend' : 'friends'}
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2].map((i) => (
              <div key={i} className="web3-card rounded-xl p-3 border border-white/5 animate-pulse h-14" />
            ))}
          </div>
        ) : referrals.length === 0 ? (
          <div className="web3-card border border-dashed border-white/10 rounded-2xl p-7 flex flex-col items-center justify-center text-center shadow-md">
            <div className="w-10 h-10 rounded-full bg-control-bg flex items-center justify-center text-text-tertiary mb-2.5">
              <Users size={18} />
            </div>
            <div className="text-xs font-extrabold text-text-primary mb-1">No referrals yet</div>
            <div className="text-[11px] text-text-tertiary max-w-[240px] leading-relaxed">
              Share your link to start earning 5 USDT per qualified friend!
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {referrals.map((ref) => {
              const statusConf = STATUS_CONFIG[ref.status] || STATUS_CONFIG.CREATED;
              const displayName = ref.refereeUsername ? `@${ref.refereeUsername}` : ref.refereeName;
              return (
                <div
                  key={ref.id}
                  className="web3-card rounded-xl p-3 flex items-center justify-between border border-white/5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-usdt-green/10 border border-usdt-green/20 flex items-center justify-center text-xs font-bold text-usdt-green flex-shrink-0">
                      {getInitial(ref.refereeName)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-extrabold text-text-primary">{displayName}</span>
                      <span className={`text-[10px] mt-0.5 flex items-center gap-1 font-bold ${statusConf.color}`}>
                        {statusConf.icon}
                        {statusConf.label}
                      </span>
                    </div>
                  </div>
                  {ref.status === 'REWARDED' && (
                    <div className="flex items-center gap-1 text-xs font-bold text-gold font-mono">
                      <span>₮</span>
                      <span>5.00</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};
