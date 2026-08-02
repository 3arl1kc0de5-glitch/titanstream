import { PrismaClient, EducationModuleId } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const modules = [
    {
      id: 'crypto_basics' as EducationModuleId,
      title: 'What is Crypto?',
      description: 'Learn the basics of cryptocurrencies, USDT, TON, wallets, and blockchain networks',
      mandatory: true,
      estimatedSeconds: 120,
      orderIndex: 0,
      completionType: 'view_all',
      content: [
        {
          type: 'text',
          data: { text: 'Cryptocurrencies are digital assets that use blockchain technology to enable secure transactions without intermediaries.' },
          localizationKey: 'edu.crypto_basics.slide1',
        },
        {
          type: 'text',
          data: { text: 'USDT (Tether) is a stablecoin — its value is pegged to the US Dollar. TON is the native cryptocurrency of the Telegram Open Network.' },
          localizationKey: 'edu.crypto_basics.slide2',
        },
        {
          type: 'text',
          data: { text: 'A wallet is a digital tool that stores your cryptocurrency. Each wallet has a public address (like an account number) and a private key (like a password). Never share your private key!' },
          localizationKey: 'edu.crypto_basics.slide3',
        },
        {
          type: 'text',
          data: { text: 'TitanStream uses a simulated mining system. You earn in-app balances that can be withdrawn as real USDT or TON to your external wallet.' },
          localizationKey: 'edu.crypto_basics.slide4',
        },
      ],
    },
    {
      id: 'welcome' as EducationModuleId,
      title: 'Welcome to TitanStream',
      description: 'What this platform is, what it is not, and the high-level opportunity',
      mandatory: true,
      estimatedSeconds: 30,
      orderIndex: 1,
      completionType: 'view_all',
      content: [
        {
          type: 'text',
          data: { text: 'Welcome to TitanStream — a platform where you can earn rewards through simulated mining activities. No real crypto required to start.' },
          localizationKey: 'edu.welcome.slide1',
        },
        {
          type: 'text',
          data: { text: 'Your goal: mine USDT and TON by interacting with the app. Invite friends, complete quests, and boost your earnings.' },
          localizationKey: 'edu.welcome.slide2',
        },
      ],
    },
    {
      id: 'platform' as EducationModuleId,
      title: 'How the Platform Works',
      description: 'Mining mechanics, earning model, and boost system',
      mandatory: true,
      estimatedSeconds: 120,
      orderIndex: 2,
      completionType: 'view_all',
      content: [
        {
          type: 'text',
          data: { text: 'Mining: Tap the spinner to earn. Your mining speed (GH/s) determines your rate.' },
          localizationKey: 'edu.platform.slide1',
        },
        {
          type: 'text',
          data: { text: 'Cooler System: Tap the cooler to multiply your speed. Multiplier decays over time — keep tapping!' },
          localizationKey: 'edu.platform.slide2',
        },
        {
          type: 'text',
          data: { text: 'Boosts: Purchase multipliers to accelerate earnings for a limited time.' },
          localizationKey: 'edu.platform.slide3',
        },
        {
          type: 'text',
          data: { text: 'Invite Friends: Earn a percentage of your referrals\' mining output.' },
          localizationKey: 'edu.platform.slide4',
        },
      ],
    },
    {
      id: 'funds' as EducationModuleId,
      title: 'How Funds Move',
      description: 'USDT vs TON, on-chain vs in-app balance, and how money flows',
      mandatory: true,
      estimatedSeconds: 60,
      orderIndex: 3,
      completionType: 'view_all',
      content: [
        {
          type: 'text',
          data: { text: 'Funds you earn exist as in-app balances. When you withdraw, a real blockchain transaction is initiated.' },
          localizationKey: 'edu.funds.slide1',
        },
        {
          type: 'text',
          data: { text: 'Mining itself is simulated — you earn by participating, not by computing hashes.' },
          localizationKey: 'edu.funds.slide2',
        },
      ],
    },
    {
      id: 'actions' as EducationModuleId,
      title: 'What You Can Do',
      description: 'Mining, invites, boosts, quests, games, and withdrawals',
      mandatory: true,
      estimatedSeconds: 60,
      orderIndex: 4,
      completionType: 'view_all',
      content: [
        {
          type: 'text',
          data: { text: 'Mine — Tap the spinner to earn\nCooler — Tap to multiply speed\nBoosts — Buy speed multipliers\nFriends — Invite and earn referral rewards\nQuests — Complete tasks for bonuses\nGames — Play mini-games for crystals\nWithdraw — Move funds to your wallet' },
          localizationKey: 'edu.actions.slide1',
        },
      ],
    },
    {
      id: 'risks' as EducationModuleId,
      title: 'Risks & Responsibilities',
      description: 'Market risk, platform risk, scam awareness, and no guarantees',
      mandatory: true,
      estimatedSeconds: 120,
      orderIndex: 5,
      completionType: 'view_all',
      content: [
        {
          type: 'text',
          data: { text: 'Market Risk: The value of USDT and TON can fluctuate. Your earnings\' real-world value is not guaranteed.' },
          localizationKey: 'edu.risks.slide1',
        },
        {
          type: 'text',
          data: { text: 'Platform Risk: Mining rewards are determined by platform algorithms. We reserve the right to adjust mechanics.' },
          localizationKey: 'edu.risks.slide2',
        },
        {
          type: 'text',
          data: { text: 'Security: Never share your account. TitanStream will never ask for your private keys or seed phrase.' },
          localizationKey: 'edu.risks.slide3',
        },
        {
          type: 'acknowledgement',
          data: { text: 'I have read and understand these risks.' },
          localizationKey: 'edu.risks.acknowledge',
        },
      ],
    },
    {
      id: 'withdrawal' as EducationModuleId,
      title: 'Withdrawal Process',
      description: 'Minimum amounts, fees, processing times, and network selection',
      mandatory: true,
      estimatedSeconds: 60,
      orderIndex: 6,
      completionType: 'view_all',
      content: [
        {
          type: 'text',
          data: { text: 'Navigate to Withdraw tab\nSelect currency (USDT or TON)\nEnter amount (minimum: 10 USDT / 1 TON)\nSelect network (BEP20 or TON)\nEnter wallet address\nConfirm — processing takes 1-24 hours' },
          localizationKey: 'edu.withdrawal.slide1',
        },
      ],
    },
    {
      id: 'myths' as EducationModuleId,
      title: 'Common Misconceptions',
      description: 'Myth vs Fact: what TitanStream is and is not',
      mandatory: true,
      estimatedSeconds: 60,
      orderIndex: 7,
      completionType: 'view_all',
      content: [
        {
          type: 'myth_fact',
          data: { myth: 'This is a bank', fact: 'TitanStream is a gaming/mining platform' },
          localizationKey: 'edu.myths.myth1',
        },
        {
          type: 'myth_fact',
          data: { myth: 'Guaranteed returns', fact: 'Rewards vary based on activity' },
          localizationKey: 'edu.myths.myth2',
        },
        {
          type: 'myth_fact',
          data: { myth: 'Get rich quick', fact: 'Small, consistent earnings over time' },
          localizationKey: 'edu.myths.myth3',
        },
        {
          type: 'myth_fact',
          data: { myth: 'No risk involved', fact: 'All earnings carry some risk' },
          localizationKey: 'edu.myths.myth4',
        },
        {
          type: 'myth_fact',
          data: { myth: 'It\'s crypto trading', fact: 'It\'s simulated mining, not trading' },
          localizationKey: 'edu.myths.myth5',
        },
      ],
    },
    {
      id: 'quiz' as EducationModuleId,
      title: 'Comprehension Check',
      description: '5 multiple-choice questions to verify your understanding',
      mandatory: true,
      estimatedSeconds: 120,
      orderIndex: 8,
      completionType: 'quiz_pass',
      passThreshold: 4,
      content: [
        {
          type: 'quiz_question',
          data: {
            question: 'What is TitanStream?',
            options: ['A bank', 'A simulated mining platform', 'A cryptocurrency exchange', 'An investment fund'],
            correctIndex: 1,
            explanation: 'TitanStream is a simulated mining platform, not a bank or investment service.',
          },
          localizationKey: 'edu.quiz.q1',
        },
        {
          type: 'quiz_question',
          data: {
            question: 'Are mining rewards guaranteed?',
            options: ['Yes, always', 'No, they may fluctuate', 'Only for premium users', 'Only for the first month'],
            correctIndex: 1,
            explanation: 'Mining rewards are not guaranteed and may fluctuate based on platform algorithms.',
          },
          localizationKey: 'edu.quiz.q2',
        },
        {
          type: 'quiz_question',
          data: {
            question: 'What should you NEVER share?',
            options: ['Your username', 'Your mining speed', 'Your private keys or seed phrase', 'Your invite code'],
            correctIndex: 2,
            explanation: 'Never share your private keys or seed phrase. TitanStream will never ask for them.',
          },
          localizationKey: 'edu.quiz.q3',
        },
        {
          type: 'quiz_question',
          data: {
            question: 'How do funds move in TitanStream?',
            options: ['Direct bank transfer', 'Credit card payment', 'In-app balance converts to real crypto on withdrawal', 'PayPal'],
            correctIndex: 2,
            explanation: 'Funds exist as in-app balances. When you withdraw, a real blockchain transaction is initiated.',
          },
          localizationKey: 'edu.quiz.q4',
        },
        {
          type: 'quiz_question',
          data: {
            question: 'Is TitanStream a financial institution?',
            options: ['Yes, it is a bank', 'Yes, it is an investment firm', 'No, it is a gaming/mining platform', 'No, it is a charity'],
            correctIndex: 2,
            explanation: 'TitanStream is not a bank or financial institution. It is a simulated mining platform.',
          },
          localizationKey: 'edu.quiz.q5',
        },
      ],
    },
  ];

  for (const mod of modules) {
    await prisma.educationModule.upsert({
      where: { id: mod.id },
      create: mod,
      update: mod,
    });
    console.log(`  Module seeded: ${mod.id}`);
  }

  const assets = [
    { assetCode: 'USDT', name: 'Tether USD', symbol: 'USDT', decimals: 6 },
    { assetCode: 'USD', name: 'United States Dollar', symbol: '$', decimals: 2 },
    { assetCode: 'UGX', name: 'Ugandan Shilling', symbol: 'UGX', decimals: 0 },
    { assetCode: 'TON', name: 'Toncoin', symbol: 'TON', decimals: 9 },
  ];

  for (const asset of assets) {
    await prisma.asset.upsert({
      where: { assetCode: asset.assetCode },
      create: { ...asset, enabled: true },
      update: { ...asset, enabled: true },
    });
    console.log(`  Asset seeded: ${asset.assetCode}`);
  }

  const ledgerAccounts = [
    { code: 'PLATFORM_RESERVE', name: 'Platform Reserve', type: 'ASSET' as const },
    { code: 'USER_ASSET_LIABILITY', name: 'User Asset Liability', type: 'LIABILITY' as const },
    { code: 'FEES', name: 'Fees', type: 'REVENUE' as const },
    { code: 'ADJUSTMENTS', name: 'Adjustments', type: 'EXPENSE' as const },
    { code: 'SUSPENSE', name: 'Suspense', type: 'LIABILITY' as const },
    { code: 'SYSTEM', name: 'System', type: 'SYSTEM' as const },
  ];

  for (const account of ledgerAccounts) {
    await prisma.ledgerAccount.upsert({
      where: { code: account.code },
      create: { ...account, enabled: true, description: `${account.name} ledger account` },
      update: { ...account, enabled: true },
    });
    console.log(`  Ledger account seeded: ${account.code}`);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
