import { Injectable, Logger, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BotNotificationService } from './bot-notification.service';
import { BotAdminService } from './bot-admin.service';
import { UserLevelService } from '../growth/user-level.service';
import { SettlementProviderId, Prisma } from '@prisma/client';
import { WithdrawalService } from '../financial/withdrawal.service';

export interface WithdrawalRequestDto {
  telegramUserId: bigint;
  amount: number;
  network: string; // TRC20, ERC20, POLYGON, ARBITRUM, MOBILE_MONEY
  destinationAddress: string;
}

@Injectable()
export class BotWithdrawalService {
  private readonly logger = new Logger(BotWithdrawalService.name);
  private readonly webAppUrl = process.env.TELEGRAM_WEBAPP_URL || 'https://titanstream.app';

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: BotNotificationService,
    private readonly adminService: BotAdminService,
    private readonly userLevelService: UserLevelService,
    @Inject(forwardRef(() => WithdrawalService))
    private readonly withdrawalService: WithdrawalService,
  ) {}

  async getWithdrawalMenu(telegramUserId: bigint): Promise<{ text: string; keyboard: any }> {
    // 1. Check system emergency state
    const emergencyState = await this.prisma.emergencyControlState.findUnique({
      where: { id: 'SYSTEM_EMERGENCY_STATE' },
    });

    if (emergencyState?.withdrawalsPaused) {
      return {
        text: `<b>⛔ Withdrawals Temporarily Paused</b>\n\nWithdrawal operations are currently paused for system maintenance. Please check back shortly or contact support.`,
        keyboard: {
          inline_keyboard: [[{ text: '🆘 Contact Support', callback_data: 'cmd_help' }]],
        },
      };
    }

    // 2. Fetch User Level Summary & Daily Limit
    let dailyLimitText = '$1,000.00 USDT';
    let userTier = 'Tier 1';

    try {
      const levelSummary = await this.userLevelService.getUserLevelSummary(telegramUserId);
      userTier = `${levelSummary.levelName} (${levelSummary.currentLevel})`;
    } catch {
      // default
    }

    const text = `<b>💸 TitanStream Withdrawal Assistant</b>\n\nConvert your USDT balance directly to local cash or external crypto wallet.\n\n• <b>Your Tier:</b> ${userTier}\n• <b>Average Processing Time:</b> 3-10 minutes\n• <b>Security Status:</b> 🟢 100% Guaranteed Settlement\n\nSelect an action below:`;

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: '💸 Request Withdrawal', callback_data: 'wd_req_start' },
            { text: '📋 Pending Withdrawals', callback_data: 'wd_list_pending' },
          ],
          [
            { text: '📜 Withdrawal History', callback_data: 'wd_list_history' },
            { text: '⭐ Increase Limits', callback_data: 'asst_q_limits' },
          ],
          [
            { text: '🌐 Open Mini App Withdrawal UI', web_app: { url: `${this.webAppUrl}/withdraw` } },
          ],
        ],
      },
    };
  }

  async getWithdrawalAmountStep(): Promise<{ text: string; keyboard: any }> {
    const text = `<b>💸 Step 1: Select Withdrawal Amount</b>\n\nChoose an amount to withdraw:`;

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: '💵 $20 USDT', callback_data: 'wd_amt_20' },
            { text: '💵 $50 USDT', callback_data: 'wd_amt_50' },
            { text: '💵 $100 USDT', callback_data: 'wd_amt_100' },
          ],
          [
            { text: '💵 $250 USDT', callback_data: 'wd_amt_250' },
            { text: '💵 $500 USDT', callback_data: 'wd_amt_500' },
          ],
          [
            { text: '⬅️ Back to Menu', callback_data: 'cmd_withdraw' },
          ],
        ],
      },
    };
  }

  async getWithdrawalNetworkStep(amount: number): Promise<{ text: string; keyboard: any }> {
    const text = `<b>🌐 Step 2: Select Network / Rail</b>\n\n<b>Amount:</b> ${amount} USDT\n\nSelect payout destination network:`;

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            { text: '📲 Mobile Money (Local Cash)', callback_data: `wd_net_MOMO_${amount}` },
            { text: '⚡ TRC20 (Tron)', callback_data: `wd_net_TRC20_${amount}` },
          ],
          [
            { text: '💎 Polygon (Fast & Low Gas)', callback_data: `wd_net_POLYGON_${amount}` },
            { text: '🔷 Arbitrum', callback_data: `wd_net_ARBITRUM_${amount}` },
          ],
          [
            { text: '⬅️ Back', callback_data: 'wd_req_start' },
          ],
        ],
      },
    };
  }

  async processWithdrawalRequest(dto: WithdrawalRequestDto): Promise<{ text: string; keyboard: any }> {
    // Route request through Production Withdrawal Engine with double-entry balance lock
    const session = await this.withdrawalService.initiateWithdrawal({
      telegramUserId: dto.telegramUserId,
      amount: dto.amount,
      network: dto.network,
      destinationAddress: dto.destinationAddress,
    });

    const refCode = session?.referenceCode || `WD-${Date.now()}`;
    const meta = (session?.providerMetadata as any) || {};
    const isHighAmount = Boolean(meta.requiresManualReview);

    // Notify Telegram user
    await this.notificationService.sendSecurityWithdrawalRequested(
      dto.telegramUserId,
      dto.amount.toFixed(2),
      refCode,
    );

    // If high risk, trigger Admin Telegram alert
    if (isHighAmount) {
      await this.adminService.sendLargeWithdrawalAlert({
        userId: dto.telegramUserId.toString(),
        amount: dto.amount.toFixed(2),
        reference: refCode,
        riskLevel: 'HIGH_VOLUME',
      });
    }

    const text = `<b>💸 Withdrawal Request Submitted!</b>\n\n<b>Reference:</b> <code>${refCode}</code>\n<b>Amount:</b> <b>${dto.amount} USDT</b>\n<b>Network:</b> ${dto.network}\n<b>Destination:</b> <code>${dto.destinationAddress}</code>\n<b>Status:</b> 🟡 ${isHighAmount ? 'UNDER REVIEW' : 'PROCESSING'}\n\nYou will receive a notification as soon as settlement is completed.`;

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [{ text: '📋 View Pending Withdrawals', callback_data: 'wd_list_pending' }],
          [{ text: '🚀 Open Mini App', web_app: { url: `${this.webAppUrl}/activity` } }],
        ],
      },
    };
  }

  async listPendingWithdrawals(telegramUserId: bigint): Promise<{ text: string; keyboard: any }> {
    const pending = await this.prisma.settlementSession.findMany({
      where: {
        telegramUserId,
        status: { in: ['CREATED', 'WAITING_PAYMENT'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (pending.length === 0) {
      return {
        text: `<b>📋 Pending Withdrawals</b>\n\nYou currently have no active or pending withdrawal requests.`,
        keyboard: {
          inline_keyboard: [[{ text: '💸 Request Withdrawal', callback_data: 'wd_req_start' }]],
        },
      };
    }

    const listText = pending
      .map(
        (p) =>
          `• <code>${p.referenceCode}</code> — <b>${Number(p.requestedAmount).toFixed(2)} USDT</b> [${p.status}]`,
      )
      .join('\n');

    const text = `<b>📋 Your Pending Withdrawals (${pending.length})</b>\n\n${listText}`;

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [{ text: '🔄 Refresh List', callback_data: 'wd_list_pending' }],
          [{ text: '⬅️ Back to Withdrawal Menu', callback_data: 'cmd_withdraw' }],
        ],
      },
    };
  }

  async listWithdrawalHistory(telegramUserId: bigint): Promise<{ text: string; keyboard: any }> {
    const history = await this.prisma.settlementSession.findMany({
      where: {
        telegramUserId,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (history.length === 0) {
      return {
        text: `<b>📜 Withdrawal History</b>\n\nNo withdrawal records found.`,
        keyboard: {
          inline_keyboard: [[{ text: '💸 Request Withdrawal', callback_data: 'wd_req_start' }]],
        },
      };
    }

    const historyText = history
      .map(
        (h) =>
          `• <code>${h.referenceCode}</code> — <b>${Number(h.requestedAmount).toFixed(2)} USDT</b> [<b>${h.status}</b>]\n  <i>${new Date(h.createdAt).toLocaleDateString()}</i>`,
      )
      .join('\n\n');

    const text = `<b>📜 Recent Withdrawal History</b>\n\n${historyText}`;

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [{ text: '⬅️ Back to Withdrawal Menu', callback_data: 'cmd_withdraw' }],
        ],
      },
    };
  }
}
