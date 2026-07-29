import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationChannel } from '@prisma/client';

export interface NotificationTemplateDefinition {
  code: string;
  name: string;
  titleTemplate: string;
  bodyTemplate: string;
}

const DEFAULT_TEMPLATES: NotificationTemplateDefinition[] = [
  {
    code: 'SETTLEMENT_COMPLETED',
    name: 'Settlement Completed',
    titleTemplate: '✅ USDT Settlement Complete!',
    bodyTemplate: 'Your deposit of {amount} {asset} via {provider} has been approved and credited to your balance.',
  },
  {
    code: 'REFERRAL_COMPLETED',
    name: 'Referral Qualified',
    titleTemplate: '🎉 Referral Qualified!',
    bodyTemplate: 'Your referred friend {refereeName} has completed their first settlement. Your 5 USDT reward is pending approval!',
  },
  {
    code: 'REWARD_EARNED',
    name: 'Reward Granted',
    titleTemplate: '🎁 Reward Credited!',
    bodyTemplate: 'A reward of {amount} {asset} has been posted directly to your wallet via the Financial Orchestrator.',
  },
  {
    code: 'LEVEL_UPGRADED',
    name: 'Level Upgraded',
    titleTemplate: '🚀 Level Upgraded to {newLevel}!',
    bodyTemplate: 'Congratulations! Your trust and activity unlocked the {newLevelName} tier and new benefits.',
  },
  {
    code: 'SECURITY_EVENT',
    name: 'Security Alert',
    titleTemplate: '🛡️ Security Notification',
    bodyTemplate: 'Security activity detected on your TitanStream account: {details}.',
  },
];

@Injectable()
export class GrowthNotificationService {
  private readonly logger = new Logger(GrowthNotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Seed default notification templates.
   */
  async ensureDefaultTemplates() {
    for (const tpl of DEFAULT_TEMPLATES) {
      await this.prisma.notificationTemplate.upsert({
        where: { code: tpl.code },
        update: {},
        create: {
          code: tpl.code,
          name: tpl.name,
          titleTemplate: tpl.titleTemplate,
          bodyTemplate: tpl.bodyTemplate,
          channel: NotificationChannel.TELEGRAM,
          enabled: true,
        },
      });
    }
  }

  /**
   * Get or create notification preferences for a user.
   */
  async getPreferences(telegramUserId: bigint) {
    let pref = await this.prisma.notificationPreference.findUnique({
      where: { telegramUserId },
    });

    if (!pref) {
      pref = await this.prisma.notificationPreference.create({
        data: {
          telegramUserId,
          telegramEnabled: true,
          inAppEnabled: true,
          marketingEnabled: false,
        },
      });
    }

    return pref;
  }

  /**
   * Update notification preferences.
   */
  async updatePreferences(
    telegramUserId: bigint,
    data: { telegramEnabled?: boolean; inAppEnabled?: boolean; marketingEnabled?: boolean },
  ) {
    return this.prisma.notificationPreference.upsert({
      where: { telegramUserId },
      update: data,
      create: {
        telegramUserId,
        ...data,
      },
    });
  }

  /**
   * Dispatch a notification using a template and replace placeholder variables.
   */
  async sendNotification(data: {
    telegramUserId: bigint;
    templateCode: string;
    variables?: Record<string, string>;
  }) {
    await this.ensureDefaultTemplates();
    const prefs = await this.getPreferences(data.telegramUserId);

    if (!prefs.telegramEnabled && !prefs.inAppEnabled) {
      this.logger.log(`[GrowthNotification] User ${data.telegramUserId} disabled notifications. Skipping.`);
      return null;
    }

    const template = await this.prisma.notificationTemplate.findUnique({
      where: { code: data.templateCode },
    });

    if (!template || !template.enabled) {
      this.logger.warn(`[GrowthNotification] Template ${data.templateCode} not found or disabled.`);
      return null;
    }

    let title = template.titleTemplate;
    let body = template.bodyTemplate;

    if (data.variables) {
      Object.entries(data.variables).forEach(([key, value]) => {
        title = title.replace(new RegExp(`{${key}}`, 'g'), value);
        body = body.replace(new RegExp(`{${key}}`, 'g'), value);
      });
    }

    const message = `${title}\n\n${body}`;

    const record = await this.prisma.notificationRecord.create({
      data: {
        telegramUserId: data.telegramUserId,
        templateCode: data.templateCode,
        message,
        channel: NotificationChannel.TELEGRAM,
        status: 'SENT',
        metadata: data.variables || {},
      },
    });

    this.logger.log(`[GrowthNotification] Dispatched notification ${record.id} to user ${data.telegramUserId}`);
    return record;
  }

  /**
   * Get user notification history.
   */
  async getUserNotifications(telegramUserId: bigint, limit = 20) {
    return this.prisma.notificationRecord.findMany({
      where: { telegramUserId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
