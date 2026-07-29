import { Injectable, Logger } from '@nestjs/common';
import { TelegramUserCtx } from './bot-gate.service';

export interface EducationLesson {
  id: string;
  title: string;
  content: string;
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

@Injectable()
export class BotAssistantService {
  private readonly logger = new Logger(BotAssistantService.name);

  private readonly lessons: Record<string, EducationLesson> = {
    usdt_basics: {
      id: 'usdt_basics',
      title: '1️⃣ How USDT Works',
      content: `<b>Lesson 1: How USDT Works 💵</b>\n\nUSDT (Tether) is a stablecoin pegged 1:1 to the US Dollar. Unlike volatile cryptocurrencies like Bitcoin, 1 USDT is designed to maintain a value of $1.00 USD.\n\n<b>Why use USDT in TitanStream?</b>\n• Zero volatility risk for daily cash holdings\n• Instant 24/7 transfer across borders\n• Easy conversion to your local Mobile Money currency`,
      quiz: {
        question: 'What is the target value of 1 USDT?',
        options: ['$1.00 USD', '$10.00 USD', 'Fluctuates like Bitcoin'],
        correctIndex: 0,
        explanation: 'Correct! USDT is a stablecoin pegged 1:1 to $1.00 USD.',
      },
    },
    networks: {
      id: 'networks',
      title: '2️⃣ Understanding Crypto Networks',
      content: `<b>Lesson 2: Crypto Networks 🌐</b>\n\nUSDT exists on multiple blockchain networks. When transferring USDT, you MUST use the matching network address:\n\n• <b>TRC20 (Tron):</b> Fast, low network gas fees ($1-$2).\n• <b>ERC20 (Ethereum):</b> High security, higher gas fees ($3-$15).\n• <b>Polygon / Arbitrum:</b> Ultra-fast, micro gas fees (< $0.10).\n\n<b>⚠️ Golden Rule:</b> Always make sure the sender and receiver use the SAME network!`,
    },
    security: {
      id: 'security',
      title: '3️⃣ Security & Safe Banking',
      content: `<b>Lesson 3: Security & Anti-Phishing 🛡</b>\n\nProtect your TitanStream account:\n\n1. <b>Never share your Telegram recovery key or OTP</b> with anyone.\n2. TitanStream staff will <b>NEVER DM you first asking for funds</b>.\n3. Always verify you are interacting with official bot <code>@titanstream_bot</code>.`,
    },
    safety: {
      id: 'safety',
      title: '4️⃣ Settlement & Cashout Safety',
      content: `<b>Lesson 4: Cashout & Settlement Safety 💸</b>\n\nWhen conducting local mobile money cashouts:\n\n• Only release approval after confirming the money is in your Mobile Money account balance.\n• Check SMS notifications directly from your Mobile Money provider, not external numbers.\n• Support agents are available 24/7 via the <code>/help</code> menu.`,
    },
  };

  async getAssistantMenu(userCtx: TelegramUserCtx): Promise<{ text: string; keyboard: any }> {
    return {
      text: `<b>⭐ TitanStream Trust Assistant</b>\n\nHow can I help you today? Choose a question below or pick a Financial Education lesson:`,
      keyboard: {
        inline_keyboard: [
          [{ text: '📈 How do I increase my limit?', callback_data: 'asst_q_limits' }],
          [{ text: '🛡 What is Trust Score & Level?', callback_data: 'asst_q_trust' }],
          [{ text: '🎁 How do referral rewards work?', callback_data: 'asst_q_rewards' }],
          [{ text: '🎓 Open Financial Education Bot', callback_data: 'edu_menu' }],
          [{ text: '⬅️ Back to Main Menu', callback_data: 'cmd_start' }],
        ],
      },
    };
  }

  async handleAssistantQuery(queryKey: string): Promise<{ text: string; keyboard: any }> {
    const responses: Record<string, string> = {
      asst_q_limits: `<b>📈 How do I increase my withdrawal limits?</b>\n\nYour daily withdrawal limit grows automatically as your Trust Level increases:\n\n1. Complete successful funding & settlement transactions.\n2. Maintain 100% transaction completion rate with zero disputes.\n3. Keep your account active daily and complete financial education modules.\n\n<i>Higher levels unlock up to $10,000+ daily limits!</i>`,
      asst_q_trust: `<b>🛡 What is Trust Score & Level?</b>\n\nTitanStream calculates a dynamic Trust Score (0 - 100) based on:\n• Account age & verification\n• Completed transaction history\n• Education quiz scores\n• Dispute-free activity\n\nHigher trust score upgrades your tier: NEW -> VERIFIED -> TRUSTED -> PREMIUM -> ELITE.`,
      asst_q_rewards: `<b>🎁 How do referral rewards work?</b>\n\nWhen a friend joins using your referral link (<code>/referrals</code>) and completes their first successful transaction, you both earn USDT rewards credited directly to your balance!`,
    };

    const text = responses[queryKey] || `Information requested is currently updating.`;

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [{ text: '⭐ Ask Another Question', callback_data: 'assistant_menu' }],
          [{ text: '🚀 Open Mini App', web_app: { url: process.env.TELEGRAM_WEBAPP_URL || 'https://titanstream.app' } }],
        ],
      },
    };
  }

  async getEducationMenu(): Promise<{ text: string; keyboard: any }> {
    return {
      text: `<b>🎓 TitanStream Financial Education Bot</b>\n\nMaster crypto stability, network safety, and financial literacy in 2-minute bite-sized lessons:`,
      keyboard: {
        inline_keyboard: [
          [{ text: '1️⃣ How USDT Works', callback_data: 'edu_lesson_usdt_basics' }],
          [{ text: '2️⃣ Crypto Networks Explained', callback_data: 'edu_lesson_networks' }],
          [{ text: '3️⃣ Security & Anti-Phishing', callback_data: 'edu_lesson_security' }],
          [{ text: '4️⃣ Settlement Safety Rules', callback_data: 'edu_lesson_safety' }],
          [{ text: '⬅️ Back to Trust Assistant', callback_data: 'assistant_menu' }],
        ],
      },
    };
  }

  async getLesson(lessonKey: string): Promise<{ text: string; keyboard: any }> {
    const lesson = this.lessons[lessonKey];
    if (!lesson) {
      return this.getEducationMenu();
    }

    const keyboard: any = {
      inline_keyboard: [],
    };

    if (lesson.quiz) {
      keyboard.inline_keyboard.push([{ text: '📝 Take Quick Quiz', callback_data: `edu_quiz_${lessonKey}` }]);
    }

    keyboard.inline_keyboard.push([{ text: '🎓 Education Menu', callback_data: 'edu_menu' }]);

    return {
      text: lesson.content,
      keyboard,
    };
  }
}
