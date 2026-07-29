import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BotGateService, TelegramUserCtx } from './bot-gate.service';
import { ReferralService } from '../growth/referral.service';
import { BalanceService } from '../financial/balance.service';
import { UserLevelService } from '../growth/user-level.service';
import { SupportService } from '../admin/services/support.service';
import { SupportCategory, SupportPriority } from '@prisma/client';

export const getPersistentMainKeyboard = (webAppUrl: string) => ({
  keyboard: [
    [{ text: '🚀 Open TitanStream', web_app: { url: webAppUrl } }],
    [{ text: '💰 Balance' }, { text: '➕ Deposit' }, { text: '💸 Withdraw' }],
    [{ text: '🎁 Rewards' }, { text: '⭐ Trust Level' }, { text: '👥 Referrals' }],
    [{ text: '📚 Learn' }, { text: '🆘 Support' }, { text: '⚙️ Settings' }],
  ],
  resize_keyboard: true,
});

@Injectable()
export class BotCommandService {
  private readonly logger = new Logger(BotCommandService.name);
  private readonly webAppUrl = process.env.TELEGRAM_WEBAPP_URL || 'https://titanstream.app';

  constructor(
    private readonly prisma: PrismaService,
    private readonly botGate: BotGateService,
    private readonly referralService: ReferralService,
    private readonly balanceService: BalanceService,
    private readonly userLevelService: UserLevelService,
    private readonly supportService: SupportService,
  ) {}

  async handleStart(userCtx: TelegramUserCtx, startParam?: string): Promise<{ text: string; keyboard: any }> {
    await this.botGate.ensureUserIdentity(userCtx);

    // Process referral deep linking if parameter present
    if (startParam) {
      let refCode = startParam.trim();
      if (refCode.startsWith('ref_')) {
        refCode = refCode.replace('ref_', '');
      }

      if (refCode) {
        try {
          await this.referralService.registerReferral(refCode, userCtx.id);
          this.logger.log(`Attached referral ${refCode} to user ${userCtx.id}`);
        } catch (err) {
          this.logger.warn(`Referral attachment warning for user ${userCtx.id}: ${err.message}`);
        }
      }
    }

    const gateResult = await this.botGate.processGateCheck(userCtx);
    if (!gateResult.verified) {
      return {
        text: gateResult.message,
        keyboard: gateResult.keyboard,
      };
    }

    return {
      text: gateResult.message,
      keyboard: {
        ...gateResult.keyboard,
        ...getPersistentMainKeyboard(this.webAppUrl),
      },
    };
  }

  async handleApp(userCtx: TelegramUserCtx): Promise<{ text: string; keyboard: any }> {
    const gateResult = await this.botGate.processGateCheck(userCtx);
    if (!gateResult.verified) return { text: gateResult.message, keyboard: gateResult.keyboard };

    return {
      text: `<b>TitanStream Mini App Hub 🚀</b>\n\nTap below to open your full financial dashboard:`,
      keyboard: {
        inline_keyboard: [
          [{ text: '🚀 Launch TitanStream', web_app: { url: this.webAppUrl } }],
        ],
      },
    };
  }

  async handleBalance(userCtx: TelegramUserCtx): Promise<{ text: string; keyboard: any }> {
    const gateResult = await this.botGate.processGateCheck(userCtx);
    if (!gateResult.verified) return { text: gateResult.message, keyboard: gateResult.keyboard };

    const user = await this.prisma.user.findUnique({
      where: { telegramUserId: userCtx.id },
      include: { financialAccount: true },
    });

    let availableUSDT = '0.00';
    if (user?.financialAccount?.id) {
      try {
        const balanceData = await this.balanceService.getBalances(userCtx.id, user.financialAccount.id);
        const usdtAsset = balanceData.balances.find((b) => b.assetCode === 'USDT');
        if (usdtAsset) {
          availableUSDT = Number(usdtAsset.availableBalance).toFixed(2);
        }
      } catch (err) {
        this.logger.error(`Error fetching balance: ${err.message}`);
      }
    }

    let trustLevelName = 'Level 1 (New)';
    try {
      const levelRecord = await this.userLevelService.getUserLevelSummary(userCtx.id);
      trustLevelName = `Tier ${levelRecord.currentLevel}`;
    } catch {
      // default
    }

    const text = `<b>Your TitanStream Account Balance</b>\n\n` +
      `<b>USDT:</b>\n<b>${availableUSDT} USDT</b>\n\n` +
      `<b>Trust Level:</b>\n${trustLevelName}\n\n` +
      `<b>Available Limit:</b>\n<b>${availableUSDT} USDT</b>`;

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [{ text: '🚀 Open Balance in App', web_app: { url: `${this.webAppUrl}/balance` } }],
          [{ text: '🔄 Refresh Balance', callback_data: 'cmd_balance' }],
        ],
      },
    };
  }

  async handleReferrals(userCtx: TelegramUserCtx): Promise<{ text: string; keyboard: any }> {
    const gateResult = await this.botGate.processGateCheck(userCtx);
    if (!gateResult.verified) return { text: gateResult.message, keyboard: gateResult.keyboard };

    const summary = await this.referralService.getUserReferralSummary(userCtx.id);

    const text = `<b>🎁 TitanStream Referral Program</b>\n\n` +
      `Invite friends to TitanStream and earn instant rewards on every deposit!\n\n` +
      `<b>Your Referral Link:</b>\n<code>${summary.referralLink}</code>\n\n` +
      `<b>Referral Performance:</b>\n` +
      `• Total Invited: <b>${summary.totalInvited}</b>\n` +
      `• Qualified Friends: <b>${summary.qualifiedCount}</b>\n` +
      `• Rewards Earned: <b>${summary.totalEarnedUSDT.toFixed(2)} USDT</b>`;

    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(summary.referralLink)}&text=${encodeURIComponent('Join TitanStream for instant 24/7 USDT mobile money settlements! 🚀')}`;

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [{ text: '📢 Share Referral Link', url: shareUrl }],
          [{ text: '🚀 Open Growth Hub', web_app: { url: `${this.webAppUrl}/boost` } }],
        ],
      },
    };
  }

  async handleHelp(userCtx: TelegramUserCtx): Promise<{ text: string; keyboard: any }> {
    return {
      text: `<b>💬 Support & Help Desk</b>\n\nNeed assistance with a deposit, withdrawal, or account question? Select a topic below:`,
      keyboard: {
        inline_keyboard: [
          [{ text: '💳 Deposit Issue', callback_data: 'ticket_PAYMENT_ISSUE' }],
          [{ text: '💸 Withdrawal Issue', callback_data: 'ticket_SETTLEMENT_DELAY' }],
          [{ text: '👤 Account & Limits Issue', callback_data: 'ticket_ACCOUNT_ISSUE' }],
          [{ text: '🛠 Technical Problem', callback_data: 'ticket_TECHNICAL_ISSUE' }],
          [{ text: '⭐ Ask Trust Assistant Q&A', callback_data: 'assistant_menu' }],
        ],
      },
    };
  }

  async handleSettings(userCtx: TelegramUserCtx): Promise<{ text: string; keyboard: any }> {
    return {
      text: `<b>⚙️ Account Preferences & Settings</b>\n\nManage your notification alerts and security options:`,
      keyboard: {
        inline_keyboard: [
          [{ text: '🔔 Telegram Notifications: Enabled', callback_data: 'toggle_notif' }],
          [{ text: '🌐 Language: English', callback_data: 'toggle_lang' }],
          [{ text: '🛡 Active Sessions & Audit Logs', callback_data: 'cmd_security' }],
        ],
      },
    };
  }

  async createSupportTicketFromBot(
    userCtx: TelegramUserCtx,
    categoryStr: string,
  ): Promise<{ text: string; keyboard: any }> {
    const category = (SupportCategory[categoryStr as keyof typeof SupportCategory] ||
      SupportCategory.TECHNICAL_ISSUE) as SupportCategory;

    const supportCase = await this.supportService.createCase(
      { id: 'SYSTEM_BOT', role: 'BOT_AUTOMATION' },
      {
        userId: userCtx.id.toString(),
        category,
        priority: SupportPriority.HIGH,
        notes: `Support ticket created via Telegram Bot by @${userCtx.username || userCtx.id}`,
      },
    );

    return {
      text: `<b>✅ Support Ticket Created</b>\n\n` +
        `<b>Ticket ID:</b> <code>${supportCase.id}</code>\n` +
        `<b>Category:</b> ${category}\n` +
        `<b>Status:</b> OPEN\n\n` +
        `Our support desk has been notified and an agent will assist you shortly.`,
      keyboard: {
        inline_keyboard: [
          [{ text: '💬 Chat in Support Portal', web_app: { url: `${this.webAppUrl}/support` } }],
        ],
      },
    };
  }
}
