import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotificationChannel, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EventBusService, PlatformEvent } from '../automation/event-bus.service';

export interface NotificationPayload {
  userId: bigint;
  templateCode: string;
  variables?: Record<string, string>;
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
  correlationId?: string;
  message?: string;
}

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Notification templates seed and event listeners...');
    try {
      await this.ensureDefaultTemplates();
    } catch (err: any) {
      this.logger.warn(`Failed to seed default notification templates on startup: ${err?.message}`);
    }

    // 1. Listen for SettlementCreated events
    this.eventBus.on('SettlementCreated').subscribe({
      next: async (event: PlatformEvent) => {
        const { telegramUserId, amount, asset, settlementId } = event.payload;
        await this.createNotification({
          userId: BigInt(telegramUserId),
          templateCode: 'SETTLEMENT_CREATED',
          variables: { amount, asset, reference: settlementId },
          correlationId: event.correlationId,
        });
      },
    });

    // 2. Listen for SettlementCompleted events
    this.eventBus.on('SettlementCompleted').subscribe({
      next: async (event: PlatformEvent) => {
        const { telegramUserId, amount, asset, settlementId } = event.payload;
        // Send payment confirmation alert
        await this.createNotification({
          userId: BigInt(telegramUserId),
          templateCode: 'SETTLEMENT_APPROVED',
          variables: { amount, asset, reference: settlementId },
          correlationId: event.correlationId,
        });
      },
    });

    // 3. Listen for WithdrawalRequested events
    this.eventBus.on('WithdrawalRequested').subscribe({
      next: async (event: PlatformEvent) => {
        const { telegramUserId, amount, network, withdrawalId } = event.payload;
        await this.createNotification({
          userId: BigInt(telegramUserId),
          templateCode: 'WITHDRAWAL_REQUESTED',
          variables: { amount: amount.toString(), network, reference: withdrawalId },
          correlationId: event.correlationId,
        });
      },
    });

    // 4. Listen for WithdrawalCompleted events
    this.eventBus.on('WithdrawalCompleted').subscribe({
      next: async (event: PlatformEvent) => {
        const { telegramUserId, amount, withdrawalId } = event.payload;
        await this.createNotification({
          userId: BigInt(telegramUserId),
          templateCode: 'WITHDRAWAL_COMPLETED',
          variables: { amount, reference: withdrawalId },
          correlationId: event.correlationId,
        });
      },
    });
  }

  /**
   * Resolve template variables and persist a NotificationRecord in the database.
   */
  async createNotification(payload: NotificationPayload) {
    try {
      const template = await this.prisma.notificationTemplate.findUnique({
        where: { code: payload.templateCode },
      });

      if (!template || !template.enabled) {
        this.logger.warn(`Template ${payload.templateCode} not found or disabled. Skipping.`);
        return;
      }

      // Replace variables in templates
      let message = template.bodyTemplate;
      if (payload.variables) {
        Object.entries(payload.variables).forEach(([key, val]) => {
          message = message.replace(new RegExp(`{${key}}`, 'g'), val);
        });
      }

      // Save notification to database (notifications table)
      const record = await this.prisma.notificationRecord.create({
        data: {
          telegramUserId: payload.userId,
          templateCode: payload.templateCode,
          message,
          channel: template.channel,
          status: 'UNREAD', // In-app notification initially UNREAD
          metadata: {
            variables: payload.variables || {},
            correlationId: payload.correlationId,
            priority: payload.priority || 'NORMAL',
          } as Prisma.InputJsonValue,
        },
      });

      this.logger.log(`[NotificationCenter] Saved notification record ${record.id} for user ${payload.userId}`);
      return record;
    } catch (err: any) {
      this.logger.error(`Failed to create notification: ${err.message}`);
    }
  }

  /**
   * Get all active in-app notifications for a user.
   */
  async getNotificationsForUser(telegramUserId: bigint) {
    return this.prisma.notificationRecord.findMany({
      where: { telegramUserId, channel: NotificationChannel.IN_APP },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Mark notification as read.
   */
  async markAsRead(telegramUserId: bigint, id: string) {
    return this.prisma.notificationRecord.updateMany({
      where: { id, telegramUserId },
      data: { status: 'READ' },
    });
  }

  /**
   * Mark all notifications as read.
   */
  async markAllAsRead(telegramUserId: bigint) {
    return this.prisma.notificationRecord.updateMany({
      where: { telegramUserId, status: 'UNREAD' },
      data: { status: 'READ' },
    });
  }

  /**
   * Seed default notification templates.
   */
  private async ensureDefaultTemplates() {
    const defaults = [
      {
        code: 'ACCOUNT_CREATED',
        name: 'Account Created',
        titleTemplate: 'Welcome to TitanStream',
        bodyTemplate: 'Welcome {firstName}! Your Telegram identity node has been initialized successfully.',
        channel: NotificationChannel.IN_APP,
      },
      {
        code: 'EDUCATION_COMPLETED',
        name: 'Education Completed',
        titleTemplate: 'Cloud Onboarding Complete',
        bodyTemplate: 'You completed the Cloud Compute Education modules and earned +{reward} Crystals!',
        channel: NotificationChannel.IN_APP,
      },
      {
        code: 'WALLET_FUNDED',
        name: 'Wallet Funded',
        titleTemplate: 'Wallet Balance Credited',
        bodyTemplate: 'Your wallet has been credited with {amount} {asset}. Total available balance updated.',
        channel: NotificationChannel.IN_APP,
      },
      {
        code: 'DEPOSIT_PENDING',
        name: 'Deposit Pending',
        titleTemplate: 'Deposit Processing',
        bodyTemplate: 'Deposit order {reference} of {amount} {asset} is pending payment confirmation.',
        channel: NotificationChannel.IN_APP,
      },
      {
        code: 'DEPOSIT_APPROVED',
        name: 'Deposit Approved',
        titleTemplate: 'Deposit Confirmed',
        bodyTemplate: 'Deposit of {amount} {asset} confirmed! Funds are now available in your wallet.',
        channel: NotificationChannel.IN_APP,
      },
      {
        code: 'DEPOSIT_REJECTED',
        name: 'Deposit Rejected',
        titleTemplate: 'Deposit Failed',
        bodyTemplate: 'Deposit order {reference} could not be verified. Reason: {reason}.',
        channel: NotificationChannel.IN_APP,
      },
      {
        code: 'MACHINE_PURCHASED',
        name: 'Machine Purchased',
        titleTemplate: 'Cloud Machine Acquired',
        bodyTemplate: 'Successfully purchased {machineName} ({capacity} GH/s) for {price} USDT.',
        channel: NotificationChannel.IN_APP,
      },
      {
        code: 'MACHINE_ACTIVATED',
        name: 'Machine Activated',
        titleTemplate: 'Machine Operational',
        bodyTemplate: '🎉 {machineName} is now ACTIVE and generating daily compute yields 24/7!',
        channel: NotificationChannel.IN_APP,
      },
      {
        code: 'DAILY_EARNINGS',
        name: 'Daily Earnings Credited',
        titleTemplate: 'Daily Compute Yield',
        bodyTemplate: 'Your active cloud machines generated {amount} USDT ({localYield}) in daily yield today!',
        channel: NotificationChannel.IN_APP,
      },
      {
        code: 'WITHDRAWAL_REQUESTED',
        name: 'Withdrawal Requested',
        titleTemplate: 'Payout Initiated',
        bodyTemplate: 'Withdrawal request of {amount} USDT to network {network} is pending operator approval.',
        channel: NotificationChannel.IN_APP,
      },
      {
        code: 'WITHDRAWAL_APPROVED',
        name: 'Withdrawal Approved',
        titleTemplate: 'Payout Approved',
        bodyTemplate: 'Your withdrawal request of {amount} USDT has been approved and queued for dispatch.',
        channel: NotificationChannel.IN_APP,
      },
      {
        code: 'WITHDRAWAL_REJECTED',
        name: 'Withdrawal Rejected',
        titleTemplate: 'Payout Rejected',
        bodyTemplate: 'Withdrawal request {reference} was rejected. Funds returned to your available balance.',
        channel: NotificationChannel.IN_APP,
      },
      {
        code: 'REFERRAL_JOINED',
        name: 'Referral Joined',
        titleTemplate: 'New Partner Joined',
        bodyTemplate: 'User {username} joined TitanStream using your referral link!',
        channel: NotificationChannel.IN_APP,
      },
      {
        code: 'REFERRAL_MILESTONE_REACHED',
        name: 'Referral Milestone',
        titleTemplate: 'Partner Bonus Unlocked',
        bodyTemplate: 'Congratulations! You reached the {milestone} referral milestone and earned +{bonus} USDT!',
        channel: NotificationChannel.IN_APP,
      },
      {
        code: 'SUPPORT_UPDATE',
        name: 'Support Ticket Update',
        titleTemplate: 'Support Response',
        bodyTemplate: 'An update was posted to your support ticket #{ticketId}: "{responseSnippet}".',
        channel: NotificationChannel.IN_APP,
      },
      {
        code: 'PLATFORM_ANNOUNCEMENT',
        name: 'Platform Announcement',
        titleTemplate: 'Announcement',
        bodyTemplate: '{announcementText}',
        channel: NotificationChannel.IN_APP,
      },
      {
        code: 'SYSTEM_MAINTENANCE',
        name: 'System Maintenance',
        titleTemplate: 'Maintenance Notice',
        bodyTemplate: 'Scheduled maintenance starting {scheduledTime}. Computing yields continue uninterrupted.',
        channel: NotificationChannel.IN_APP,
      },
      {
        code: 'MISSION_CONTROL_ALERT',
        name: 'Mission Control Alert',
        titleTemplate: 'System Telemetry Alert',
        bodyTemplate: '[Mission Control] {alertMessage} (Level: {severity}).',
        channel: NotificationChannel.IN_APP,
      },
      {
        code: 'ADMIN_ACTION',
        name: 'Admin Action Executed',
        titleTemplate: 'Account Adjustment',
        bodyTemplate: 'An administrative action was recorded on your account: {actionDetails}.',
        channel: NotificationChannel.IN_APP,
      },
      {
        code: 'SETTLEMENT_CREATED',
        name: 'Settlement Started',
        titleTemplate: 'Funding request created',
        bodyTemplate: 'Funding request initialized for {amount} {asset}. Awaiting verification.',
        channel: NotificationChannel.IN_APP,
      },
    ];

    for (const item of defaults) {
      await this.prisma.notificationTemplate.upsert({
        where: { code: item.code },
        update: {},
        create: {
          code: item.code,
          name: item.name,
          titleTemplate: item.titleTemplate,
          bodyTemplate: item.bodyTemplate,
          channel: item.channel,
          enabled: true,
        },
      });
    }
  }
}
