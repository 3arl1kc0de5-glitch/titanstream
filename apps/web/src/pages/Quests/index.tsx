import type React from 'react';
import { motion } from 'framer-motion';
import { useQuestStore, type QuestItem } from '../../store/useQuestStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useNavigationStore } from '../../store/useNavigationStore';
import { showToast } from '../../components/Toast';

export const QuestsScreen: React.FC = () => {
  const { quests, activeTab, activeCategory, setActiveTab, setActiveCategory, claimQuest, incrementProgress } = useQuestStore();
  const { oursCount, partnerCount, decrementBadge } = useNotificationStore();
  const { crystalsBalance, updateBalance } = useWalletStore();
  const { openGames } = useNavigationStore();

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
    if (q.type !== activeTab) return false;
    if (activeCategory === 'All ours' || activeCategory === 'Partner') return true;
    return q.category.toLowerCase() === activeCategory.toLowerCase();
  });

  const handleClaim = (quest: QuestItem) => {
    // 1. Credit Crystal Reward
    updateBalance({ crystalsBalance: crystalsBalance + quest.rewardValue });
    // 2. Mark quest as claimed in store
    claimQuest(quest.id);
    // 3. Decrement notification badge count
    decrementBadge(quest.type);

    showToast(`Claimed +${quest.rewardValue} Crystals from "${quest.title}"!`, 'success');
  };

  const handleAction = (quest: QuestItem) => {
    if (quest.actionLabel === 'Play') {
      openGames();
      showToast('Opening Mini-Games lobby...', 'info');
    } else if (quest.actionLabel === 'Add') {
      // Simulate adding shortcut
      incrementProgress(quest.id, 1);
      showToast('Shortcut successfully added to Home Screen!', 'success');
    } else if (quest.actionLabel === 'Post story') {
      // Simulate posting story
      incrementProgress(quest.id, 1);
      showToast('Story successfully shared on Telegram!', 'success');
    } else if (quest.externalUrl) {
      // Open external partner link
      window.open(quest.externalUrl, '_blank');
      // Automatically make it claimable for validation feedback loop
      incrementProgress(quest.id, 1);
      showToast('Task opened! Return to claim your reward.', 'success');
    } else {
      showToast(`Executing ${quest.actionLabel || 'task'}...`, 'info');
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Top Tab Switcher (Ours vs Partner) - iOS Segmented Control */}
      <div className="bg-control-bg/80 backdrop-blur-md p-1 rounded-2xl flex items-center border border-white/10 relative shadow-inner">
        <button
          onClick={() => setActiveTab('OURS')}
          className={`
            relative flex-1 py-2.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 press-feedback transition-colors z-10
            ${activeTab === 'OURS' ? 'text-usdt-green' : 'text-text-secondary hover:text-text-primary'}
          `}
        >
          {activeTab === 'OURS' && (
            <motion.div
              layoutId="questSegmentTab"
              className="absolute inset-0 bg-usdt-green/15 border border-usdt-green/40 rounded-xl shadow-[0_0_15px_rgba(0,230,118,0.2)]"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">Ours</span>
          <span className="relative z-10 bg-usdt-green/20 text-usdt-green text-xs font-mono px-2 py-0.5 rounded-full border border-usdt-green/30">
            {oursCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('PARTNER')}
          className={`
            relative flex-1 py-2.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 press-feedback transition-colors z-10
            ${activeTab === 'PARTNER' ? 'text-usdt-green' : 'text-text-secondary hover:text-text-primary'}
          `}
        >
          {activeTab === 'PARTNER' && (
            <motion.div
              layoutId="questSegmentTab"
              className="absolute inset-0 bg-usdt-green/15 border border-usdt-green/40 rounded-xl shadow-[0_0_15px_rgba(0,230,118,0.2)]"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10">Partner</span>
          <span className="relative z-10 bg-control-bg text-text-secondary text-xs font-mono px-2 py-0.5 rounded-full border border-white/10">
            {partnerCount}
          </span>
        </button>
      </div>

      {/* Horizontal Category Carousel */}
      {activeTab === 'OURS' && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`
                  px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap press-feedback transition-all shadow-sm
                  ${isActive
                    ? 'bg-usdt-green/20 border border-usdt-green/40 text-usdt-green shadow-[0_0_10px_rgba(0,230,118,0.2)]'
                    : 'bg-control-bg/80 text-text-secondary hover:text-text-primary border border-white/10'
                  }
                `}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* Quest Cards List */}
      <div className="flex flex-col gap-3">
        {filteredQuests.map((quest, idx) => {
          const isClaimable = quest.status === 'CLAIMABLE';
          const isComplete = quest.status === 'CLAIMED';

          return (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.04 }}
              className={`glass-panel rounded-2xl p-4 flex flex-col gap-3 transition-all shadow-lg ${
                isClaimable
                  ? 'border-usdt-green/45 shadow-[0_0_20px_rgba(0,230,118,0.15)] bg-gradient-to-b from-[#1c1f2b] to-[#0e2217]'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-control-bg border border-white/10 flex items-center justify-center text-lg flex-shrink-0 shadow-inner">
                    {quest.category === 'Games' ? '🎮' : '💎'}
                  </div>

                  <div className="flex flex-col">
                    <h3 className="text-sm font-extrabold text-text-primary">{quest.title}</h3>
                    <p className="text-xs text-text-secondary mt-0.5">{quest.subtitle}</p>
                  </div>
                </div>

                {isClaimable && (
                  <span className="text-xs font-extrabold text-usdt-green bg-usdt-green/15 px-3 py-1 rounded-full border border-usdt-green/30 animate-pulse">
                    Ready
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              {quest.target > 1 && (
                <div className="flex flex-col gap-1 text-[11px] text-text-tertiary">
                  <div className="flex justify-between font-mono">
                    <span>Progress</span>
                    <span className="font-bold text-text-secondary">{quest.progress} / {quest.target}</span>
                  </div>
                  <div className="w-full h-2 bg-control-bg rounded-full overflow-hidden p-0.5 border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-usdt-green/60 to-usdt-green rounded-full shadow-[0_0_10px_rgba(0,230,118,0.5)] transition-all duration-300"
                      style={{ width: `${(quest.progress / quest.target) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Bottom row: Reward + Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <div className="bg-control-bg/80 border border-white/10 rounded-full px-3 py-1 text-xs font-extrabold text-text-primary flex items-center gap-1 font-mono shadow-inner">
                  <span>+</span>
                  <span className="text-crystals-blue">💎</span>
                  <span>{quest.rewardValue}</span>
                </div>

                <div className="flex items-center gap-2">
                  {!isComplete && (quest.actionLabel || quest.externalUrl) && (
                    <button
                      onClick={() => handleAction(quest)}
                      className="press-feedback bg-control-bg hover:bg-border text-text-primary font-bold text-xs px-4 py-2 rounded-xl border border-white/10 shadow-sm"
                    >
                      {quest.actionLabel || 'Go'}
                    </button>
                  )}

                  <button
                    disabled={!isClaimable || isComplete}
                    onClick={() => handleClaim(quest)}
                    className={`
                      press-feedback font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md
                      ${isClaimable
                        ? 'bg-gradient-to-r from-usdt-green to-[#00c853] text-app-bg hover:brightness-110 shadow-[0_0_15px_rgba(0,230,118,0.4)]'
                        : 'bg-control-bg/60 text-text-tertiary border border-white/5 cursor-not-allowed'
                      }
                    `}
                  >
                    {isComplete ? 'Claimed' : 'Claim'}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
