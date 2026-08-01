import type React from 'react';
import { motion } from 'framer-motion';
import { useReferralStore } from '../../store/useReferralStore';
import { showToast } from '../../components/Toast';
import { Copy, Share2, Users, Flame, Star, Award, Gift } from 'lucide-react';
import { EducationCard } from '../../components/EducationCard';

export const FriendsScreen: React.FC = () => {
  const {
    invitedCount,
    computeBoost,
    earnedUsdt,
    earnedTon,
    referralLink,
    referrals,
  } = useReferralStore();

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    showToast('Referral link copied!', 'success');
  };

  const handleShare = () => {
    const tg = window.Telegram?.WebApp;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Mine USDT & TON on TitanStream!')}`;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  const totalCrystalsEarned = referrals.reduce((sum, ref) => sum + ref.crystals, 0);

  return (
    <div className="p-5 flex flex-col gap-6 relative z-10">
      {/* Progressive Education: Referral */}
      <EducationCard
        educationKey="referral"
        title="Contextual Referrals"
        body="Invite friends to TitanStream and receive bonus compute capacity (+0.2 CU per friend) and a continuous 1% real-time share of all USDT they generate. No limits, no thresholds."
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
          Invite friends to TitanStream. You will receive compute capacity boosts and a direct share of all USDT & TON they earn.
        </p>
      </motion.div>

      {/* 4 Quadrants Dashboard Grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="web3-card rounded-2xl p-4.5 grid grid-cols-2 gap-4 relative overflow-hidden"
      >
        {/* Quadrant 1 */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-extrabold text-text-tertiary uppercase tracking-wider">Invited</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-text-primary font-mono">{invitedCount}</span>
            <span className="text-[10px] font-bold text-text-secondary">users</span>
          </div>
        </div>

        {/* Quadrant 2 */}
        <div className="flex flex-col gap-0.5 border-l border-white/5 pl-4">
          <span className="text-[10px] font-extrabold text-text-tertiary uppercase tracking-wider">Compute Boost</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-gradient-neon font-mono">+{computeBoost}×</span>
          </div>
        </div>

        {/* Quadrant 3 */}
        <div className="flex flex-col gap-0.5 border-t border-white/5 pt-4">
          <span className="text-[10px] font-extrabold text-text-tertiary uppercase tracking-wider">Earned USDT</span>
          <div className="flex items-center gap-1.5 mt-1 font-mono">
            <span className="text-sm font-extrabold text-usdt-green">₮</span>
            <span className="text-lg font-black text-text-primary">{(Number(earnedUsdt) || 0).toFixed(5)}</span>
          </div>
        </div>

        {/* Quadrant 4 */}
        <div className="flex flex-col gap-0.5 border-t border-white/5 pt-4 border-l pl-4">
          <span className="text-[10px] font-extrabold text-text-tertiary uppercase tracking-wider">Earned TON</span>
          <div className="flex items-center gap-1.5 mt-1 font-mono">
            <span className="text-sm font-extrabold text-ton-blue">💎</span>
            <span className="text-lg font-black text-text-primary">{(Number(earnedTon) || 0).toFixed(5)}</span>
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
            {referralLink}
          </span>
          <button
            onClick={handleCopy}
            className="press-feedback bg-white/5 border border-white/10 hover:bg-white/10 text-usdt-green font-extrabold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5"
          >
            <Copy size={13} />
            Copy
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-1">
          <button
            onClick={handleCopy}
            className="press-feedback btn-glossy-secondary py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm"
          >
            <Copy size={16} />
            Copy link
          </button>
          <button
            onClick={handleShare}
            className="press-feedback btn-glossy-primary py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-[0_4px_20px_rgba(0,255,135,0.3)]"
          >
            <Share2 size={16} />
            Share Link
          </button>
        </div>
      </motion.div>

      {/* WHAT FRIENDS GIVE section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col gap-3.5"
      >
        <h2 className="text-xs font-black text-text-tertiary tracking-widest uppercase">What Friends Give</h2>

        <div className="flex flex-col gap-3">
          {/* Benefit 1 */}
          <div className="web3-card rounded-xl p-3.5 flex items-center gap-3.5 border border-white/5 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-usdt-green/15 border border-usdt-green/30 text-usdt-green flex items-center justify-center shadow-[0_0_15px_rgba(0,230,118,0.15)] flex-shrink-0">
              <Flame size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-extrabold text-text-primary">More compute capacity</span>
              <span className="text-[11px] text-text-secondary mt-0.5">+0.2 CU compute capacity per friend</span>
            </div>
          </div>

          {/* Benefit 2 */}
          <div className="web3-card rounded-xl p-3.5 flex items-center gap-3.5 border border-white/5 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-ton-blue/15 border border-ton-blue/30 text-ton-blue flex items-center justify-center shadow-[0_0_15px_rgba(0,136,204,0.15)] flex-shrink-0">
              <Star size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-extrabold text-text-primary">1% share of referral USDT</span>
              <span className="text-[11px] text-text-secondary mt-0.5">Earn 1% of all USDT they generate in real-time</span>
            </div>
          </div>

          {/* Benefit 3 */}
          <div className="web3-card rounded-xl p-3.5 flex items-center gap-3.5 border border-white/5 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 text-gold flex items-center justify-center shadow-[0_0_15px_rgba(255,179,0,0.15)] flex-shrink-0">
              <Award size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-extrabold text-text-primary">1% share of referral TON</span>
              <span className="text-[11px] text-text-secondary mt-0.5">Earn 1% of all TON they mine in real-time</span>
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
            {invitedCount} users · {totalCrystalsEarned} cryst.
          </span>
        </div>

        {referrals.length === 0 ? (
          <div className="web3-card border border-dashed border-white/10 rounded-2xl p-7 flex flex-col items-center justify-center text-center shadow-md">
            <div className="w-10 h-10 rounded-full bg-control-bg flex items-center justify-center text-text-tertiary mb-2.5">
              <Users size={18} />
            </div>
            <div className="text-xs font-extrabold text-text-primary mb-1">No referrals yet</div>
            <div className="text-[11px] text-text-tertiary max-w-[240px] leading-relaxed">
              Share your link with your friends to unlock compute capacity boosts and commissions!
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {referrals.map((ref) => (
              <div
                key={ref.id}
                className="web3-card rounded-xl p-3 flex items-center justify-between border border-white/5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-usdt-green/10 border border-usdt-green/20 flex items-center justify-center text-xs font-bold text-usdt-green">
                    {ref.username[0].toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold text-text-primary">@{ref.username}</span>
                    <span className="text-[10px] text-text-tertiary mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00e676] animate-pulse" /> Active Miner
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-text-secondary font-mono">
                  <span>💎</span>
                  <span>{ref.crystals}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};
