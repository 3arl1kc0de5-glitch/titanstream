import { create } from 'zustand';

type QuestType = 'OURS' | 'PARTNER';
type QuestStatus = 'IN_PROGRESS' | 'CLAIMABLE' | 'CLAIMED';
type RewardType = 'BOOST' | 'CRYSTALS';

export interface QuestItem {
  id: string;
  type: QuestType;
  category: string;
  title: string;
  subtitle: string;
  rewardType: RewardType;
  rewardValue: number;
  progress: number;
  target: number;
  status: QuestStatus;
  actionLabel?: string;
  externalUrl?: string;
}

interface QuestState {
  quests: QuestItem[];
  activeTab: QuestType;
  activeCategory: string;
  setActiveTab: (tab: QuestType) => void;
  setActiveCategory: (category: string) => void;
  incrementProgress: (id: string, amount?: number) => void;
  incrementCategoryProgress: (category: string, amount?: number) => void;
  claimQuest: (id: string) => void;
}

const PLACEHOLDER_QUESTS: QuestItem[] = [
  // ours - Daily login
  {
    id: 'q1',
    type: 'OURS',
    category: 'Daily login',
    title: 'Open the game',
    subtitle: 'Launch the mini app today',
    rewardType: 'CRYSTALS',
    rewardValue: 2,
    progress: 1,
    target: 1,
    status: 'CLAIMABLE',
  },
  {
    id: 'q2',
    type: 'OURS',
    category: 'Daily login',
    title: '3-Day Login Streak',
    subtitle: 'Open the app 3 days in a row',
    rewardType: 'CRYSTALS',
    rewardValue: 15,
    progress: 1,
    target: 3,
    status: 'IN_PROGRESS',
  },
  {
    id: 'q3',
    type: 'OURS',
    category: 'Daily login',
    title: '7-Day Login Streak',
    subtitle: 'Open the app 7 days in a row',
    rewardType: 'CRYSTALS',
    rewardValue: 50,
    progress: 1,
    target: 7,
    status: 'IN_PROGRESS',
  },
  // ours - Friends
  {
    id: 'q4',
    type: 'OURS',
    category: 'Friends',
    title: 'Invite 1 friend',
    subtitle: 'Get your first active referral',
    rewardType: 'CRYSTALS',
    rewardValue: 10,
    progress: 0,
    target: 1,
    status: 'IN_PROGRESS',
  },
  {
    id: 'q5',
    type: 'OURS',
    category: 'Friends',
    title: 'Invite 3 friends',
    subtitle: 'Get 3 active referrals',
    rewardType: 'CRYSTALS',
    rewardValue: 35,
    progress: 0,
    target: 3,
    status: 'IN_PROGRESS',
  },
  {
    id: 'q6',
    type: 'OURS',
    category: 'Friends',
    title: 'Invite 5 friends',
    subtitle: 'Get 5 active referrals',
    rewardType: 'CRYSTALS',
    rewardValue: 75,
    progress: 0,
    target: 5,
    status: 'IN_PROGRESS',
  },
  {
    id: 'q7',
    type: 'OURS',
    category: 'Friends',
    title: 'Invite 10 friends',
    subtitle: 'Get 10 active referrals',
    rewardType: 'CRYSTALS',
    rewardValue: 200,
    progress: 0,
    target: 10,
    status: 'IN_PROGRESS',
  },
  {
    id: 'q8',
    type: 'OURS',
    category: 'Friends',
    title: 'Invite 25 friends',
    subtitle: 'Get 25 active referrals',
    rewardType: 'CRYSTALS',
    rewardValue: 600,
    progress: 0,
    target: 25,
    status: 'IN_PROGRESS',
  },
  // ours - Taps
  {
    id: 'q9',
    type: 'OURS',
    category: 'Taps',
    title: 'Tap the cooler 50 times',
    subtitle: 'Accumulate manual spinner cooler taps',
    rewardType: 'CRYSTALS',
    rewardValue: 5,
    progress: 12,
    target: 50,
    status: 'IN_PROGRESS',
  },
  {
    id: 'q10',
    type: 'OURS',
    category: 'Taps',
    title: 'Tap the cooler 500 times',
    subtitle: 'Accumulate manual spinner cooler taps',
    rewardType: 'CRYSTALS',
    rewardValue: 60,
    progress: 12,
    target: 500,
    status: 'IN_PROGRESS',
  },
  {
    id: 'q11',
    type: 'OURS',
    category: 'Taps',
    title: 'Tap the cooler 2,500 times',
    subtitle: 'Accumulate manual spinner cooler taps',
    rewardType: 'CRYSTALS',
    rewardValue: 400,
    progress: 12,
    target: 2500,
    status: 'IN_PROGRESS',
  },
  // ours - Home screen
  {
    id: 'q12',
    type: 'OURS',
    category: 'Home screen',
    title: 'Add shortcut to home screen',
    subtitle: 'Place the app shortcut on your phone home screen',
    rewardType: 'CRYSTALS',
    rewardValue: 10,
    progress: 0,
    target: 1,
    status: 'IN_PROGRESS',
    actionLabel: 'Add',
  },
  // ours - Stories
  {
    id: 'q13',
    type: 'OURS',
    category: 'Stories',
    title: 'Post daily story',
    subtitle: 'Share your current mining rate on your TG story',
    rewardType: 'CRYSTALS',
    rewardValue: 20,
    progress: 0,
    target: 1,
    status: 'IN_PROGRESS',
    actionLabel: 'Post story',
  },
  // ours - Achievements
  {
    id: 'q14',
    type: 'OURS',
    category: 'Achievements',
    title: 'Reach 50 CU Compute Power',
    subtitle: 'Upgrade your compute power multiplier',
    rewardType: 'CRYSTALS',
    rewardValue: 25,
    progress: 1,
    target: 5,
    status: 'IN_PROGRESS',
  },
  {
    id: 'q15',
    type: 'OURS',
    category: 'Achievements',
    title: 'Reach 100 CU Compute Power',
    subtitle: 'Upgrade your compute power multiplier',
    rewardType: 'CRYSTALS',
    rewardValue: 75,
    progress: 1,
    target: 10,
    status: 'IN_PROGRESS',
  },
  {
    id: 'q16',
    type: 'OURS',
    category: 'Achievements',
    title: 'Reach 500 CU Compute Power',
    subtitle: 'Upgrade your compute power multiplier',
    rewardType: 'CRYSTALS',
    rewardValue: 500,
    progress: 1,
    target: 50,
    status: 'IN_PROGRESS',
  },
  {
    id: 'q17',
    type: 'OURS',
    category: 'Achievements',
    title: 'Accumulate 1.0 USDT total balance',
    subtitle: 'Generate yield on your device',
    rewardType: 'CRYSTALS',
    rewardValue: 30,
    progress: 0.2268,
    target: 1,
    status: 'IN_PROGRESS',
  },
  {
    id: 'q18',
    type: 'OURS',
    category: 'Achievements',
    title: 'Mine 10.0 USDT total balance',
    subtitle: 'Mine Tether on your device',
    rewardType: 'CRYSTALS',
    rewardValue: 400,
    progress: 0.2268,
    target: 10,
    status: 'IN_PROGRESS',
  },
  // ours - Games
  {
    id: 'q19',
    type: 'OURS',
    category: 'Games',
    title: 'Spin Roulette Wheel Once',
    subtitle: 'Try your luck in the mini-games lobby',
    rewardType: 'CRYSTALS',
    rewardValue: 15,
    progress: 0,
    target: 1,
    status: 'IN_PROGRESS',
    actionLabel: 'Play',
  },
  {
    id: 'q20',
    type: 'OURS',
    category: 'Games',
    title: 'Spin Roulette Wheel 5 Times',
    subtitle: 'Try your luck in the mini-games lobby',
    rewardType: 'CRYSTALS',
    rewardValue: 90,
    progress: 0,
    target: 5,
    status: 'IN_PROGRESS',
    actionLabel: 'Play',
  },
  {
    id: 'q21',
    type: 'OURS',
    category: 'Games',
    title: 'Score 10 Hoops in Hoop Masters',
    subtitle: 'Show your skills in our physics basketball game',
    rewardType: 'CRYSTALS',
    rewardValue: 20,
    progress: 0,
    target: 10,
    status: 'IN_PROGRESS',
    actionLabel: 'Play',
  },

  // Partner quests
  {
    id: 'p1',
    type: 'PARTNER',
    category: 'Partner',
    title: '⛏ $ MINE WITH AI',
    subtitle: '💰 Hire AI-robots, stack Credits, withdraw USDT\nComplete the task and get the reward',
    rewardType: 'CRYSTALS',
    rewardValue: 10,
    progress: 0,
    target: 1,
    status: 'IN_PROGRESS',
    externalUrl: 'https://t.me/example_bot',
  },
  {
    id: 'p2',
    type: 'PARTNER',
    category: 'Partner',
    title: 'Free stars on Telegram ⭐️',
    subtitle: 'Complete the task and get the reward',
    rewardType: 'CRYSTALS',
    rewardValue: 10,
    progress: 0,
    target: 1,
    status: 'IN_PROGRESS',
    externalUrl: 'https://t.me/example_bot2',
  },
  {
    id: 'p3',
    type: 'PARTNER',
    category: 'Partner',
    title: 'BONUS 500$ 🤑',
    subtitle: 'Complete the task and get the reward',
    rewardType: 'CRYSTALS',
    rewardValue: 10,
    progress: 0,
    target: 1,
    status: 'IN_PROGRESS',
    externalUrl: 'https://t.me/example_bot3',
  },
  {
    id: 'p4',
    type: 'PARTNER',
    category: 'Partner',
    title: 'YouTube',
    subtitle: 'Miner\nComplete the task and get the reward',
    rewardType: 'CRYSTALS',
    rewardValue: 15,
    progress: 0,
    target: 1,
    status: 'IN_PROGRESS',
    externalUrl: 'https://t.me/example_bot4',
  },
];

export const useQuestStore = create<QuestState>((set) => ({
  quests: PLACEHOLDER_QUESTS,
  activeTab: 'OURS',
  activeCategory: 'All ours',
  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveCategory: (category) => set({ activeCategory: category }),
  incrementProgress: (id, amount = 1) =>
    set((state) => ({
      quests: state.quests.map((q) => {
        if (q.id !== id || q.status === 'CLAIMED' || q.status === 'CLAIMABLE') return q;
        const newProgress = Math.min(q.target, q.progress + amount);
        const newStatus = newProgress >= q.target ? 'CLAIMABLE' : 'IN_PROGRESS';
        return { ...q, progress: newProgress, status: newStatus as any };
      }),
    })),
  incrementCategoryProgress: (category, amount = 1) =>
    set((state) => ({
      quests: state.quests.map((q) => {
        if (q.category.toLowerCase() !== category.toLowerCase() || q.status === 'CLAIMED' || q.status === 'CLAIMABLE') return q;
        const newProgress = Math.min(q.target, q.progress + amount);
        const newStatus = newProgress >= q.target ? 'CLAIMABLE' : 'IN_PROGRESS';
        return { ...q, progress: newProgress, status: newStatus as any };
      }),
    })),
  claimQuest: (id) =>
    set((state) => ({
      quests: state.quests.map((q) => {
        if (q.id !== id) return q;
        return { ...q, status: 'CLAIMED' };
      }),
    })),
}));
