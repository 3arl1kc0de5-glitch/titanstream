import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TelegramClientService } from './telegram-client.service';
import { NotificationChannel } from '@prisma/client';

export interface SendBotNotificationDto {
  telegramUserId: bigint;
  templateCode: string;
  title?: string;
  message: string;
  metadata?: Record<string, any>;
  actionButton?: {
    text: string;
    url?: string;
    web_app?: { url: string };
  };
}

@Injectable()
export class BotNotificationService {
  private readonly logger = new Logger(BotNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramClient: TelegramClientService,
  ) {}

  async sendFinancialDepositConfirmed(
    telegramUserId: bigint,
    amount: string,
    txRef: string,
  ): Promise<boolean> {
    const text = `<b>✅ Deposit Confirmed</b>\n\n<b>Amount:</b>\n${amount} USDT\n\n<b>Transaction Ref:</b>\n<code>${txRef}</code>\n\nYour balance has been updated.`;
    return this.dispatchNotification({
      telegramUserId,
      templateCode: 'FINANCIAL_DEPOSIT_CONFIRMED',
      message: text,
      metadata: { amount, txRef },
      actionButton: {
        text: '🚀 Open Balance',
        web_app: { url: `${process.env.TELEGRAM_WEBAPP_URL || 'https://tetherstream.app'}/balance` },
      },
    });
  }

  async sendFinancialWithdrawalCompleted(
    telegramUserId: bigint,
    amount: string,
    txRef: string,
  ): Promise<boolean> {
    const text = `<b>💸 Withdrawal Completed</b>\n\n<b>Amount:</b>\n${amount} USDT\n\n<b>Transaction:</b>\n<code>${txRef}</code>`;
    return this.dispatchNotification({
      telegramUserId,
      templateCode: 'FINANCIAL_WITHDRAWAL_COMPLETED',
      message: text,
      metadata: { amount, txRef },
    });
  }

  async sendGrowthTrustLevelUpgraded(
    telegramUserId: bigint,
    newLevel: string,
  ): Promise<boolean> {
    const text = `<b>🎉 New Trust Level</b>\n\nYou reached <b>Level ${newLevel}</b>.\n\nNew benefits and higher transaction limits unlocked!`;
    return this.dispatchNotification({
      telegramUserId,
      templateCode: 'GROWTH_TRUST_LEVEL_UPGRADED',
      message: text,
      metadata: { newLevel },
      actionButton: {
        text: '⭐ View Tier Benefits',
        web_app: { url: `${process.env.TELEGRAM_WEBAPP_URL || 'https://tetherstream.app'}/boost` },
      },
    });
  }

  async sendGrowthReferralReward(
    telegramUserId: bigint,
    rewardAmount: string,
    refereeName?: string,
  ): Promise<boolean> {
    const text = `<b>🎁 Referral Reward Credited</b>\n\nYour referral ${refereeName ? `<b>${refereeName}</b> ` : ''}completed their first transaction.\n\n<b>Reward Credited:</b> +${rewardAmount} USDT`;
    return this.dispatchNotification({
      telegramUserId,
      templateCode: 'GROWTH_REFERRAL_REWARD',
      message: text,
      metadata: { rewardAmount, refereeName },
      actionButton: {
        text: '👥 Referral Dashboard',
        web_app: { url: `${process.env.TELEGRAM_WEBAPP_URL || 'https://tetherstream.app'}/boost` },
      },
    });
  }

  async sendSecurityNewLogin(
    telegramUserId: bigint,
    deviceInfo: string,
    ipAddress?: string,
  ): Promise<boolean> {
    const text = `<b>⚠️ New login detected</b>\n\n<b>Device:</b>\n${deviceInfo}\n\n<b>Time:</b>\n${new Date().toLocaleTimeString()}\n${ipAddress ? `<b>IP:</b> ${ipAddress}` : ''}`;
    return this.dispatchNotification({
      telegramUserId,
      templateCode: 'SECURITY_NEW_LOGIN',
      message: text,
      metadata: { deviceInfo, ipAddress },
    });
  }

  async sendSecurityWithdrawalRequested(
    telegramUserId: bigint,
    amount: string,
    reference: string,
  ): Promise<boolean> {
    const text = `<b>⚠️ Withdrawal request created</b>\n\n<b>Amount:</b>\n${amount} USDT\n\n<b>Reference:</b>\n<code>${reference}</code>\n\nReview required if you did not initiate this transaction.`;
    return this.dispatchNotification({
      telegramUserId,
      templateCode: 'SECURITY_WITHDRAWAL_REQUESTED',
      message: text,
      metadata: { amount, reference },
    });
  }

  async dispatchNotification(dto: SendBotNotificationDto): Promise<boolean> {
    const replyMarkup = dto.actionButton
      ? {
          inline_keyboard: [
            [
              dto.actionButton.web_app
                ? { text: dto.actionButton.text, web_app: dto.actionButton.web_app }
                : { text: dto.actionButton.text, url: dto.actionButton.url! },
            ],
          ],
        }
      : undefined;

    const res = await this.telegramClient.sendMessage(Number(dto.telegramUserId), dto.message, {
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    });

    const status = res.ok ? 'DELIVERED' : 'FAILED';

    try {
      await this.prisma.notificationRecord.create({
        data: {
          telegramUserId: dto.telegramUserId,
          templateCode: dto.templateCode,
          message: dto.message,
          channel: NotificationChannel.TELEGRAM,
          status,
          metadata: { ...dto.metadata, error: res.description },
        },
      });
    } catch (dbErr) {
      this.logger.error(`Failed to store notification record: ${dbErr.message}`);
    }

    return res.ok;
  }
}
