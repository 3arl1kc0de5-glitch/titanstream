import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { TelegramClientService } from './telegram-client.service';
import { AuditService } from '../audit/audit.service';
import { UserState, AuditEventType } from '../../common/interfaces/user-state.enum';

export interface TelegramUserCtx {
  id: bigint;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  photoUrl?: string;
}

@Injectable()
export class BotGateService {
  private readonly logger = new Logger(BotGateService.name);
  private readonly requiredChannels: { id: string; username: string; label: string }[];
  private readonly webAppUrl = process.env.TELEGRAM_WEBAPP_URL || 'https://titanstream.app';

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramClient: TelegramClientService,
    private readonly auditService: AuditService,
  ) {
    const mainChannelId = process.env.TELEGRAM_CHANNEL_ID || '@titanstream';
    const mainChannelUser = process.env.TELEGRAM_CHANNEL_USERNAME || 'titanstream';

    this.requiredChannels = [
      { id: mainChannelId, username: mainChannelUser, label: '📢 Main Community Channel' },
    ];
  }

  async verifyChannelMembership(telegramUserId: bigint, channelId?: string): Promise<{
    isMember: boolean;
    status: string;
    details?: any;
  }> {
    const targetChannel = channelId || this.requiredChannels[0].id;
    const member = await this.telegramClient.getChatMember(targetChannel, Number(telegramUserId));

    if (!member) {
      return { isMember: false, status: 'unknown' };
    }

    const acceptedStates = ['creator', 'administrator', 'member'];
    const isMember = acceptedStates.includes(member.status);

    // Audit log verification event
    try {
      await this.prisma.channelVerificationEvent.create({
        data: {
          telegramUserId,
          channelId: targetChannel,
          status: member.status,
          metadata: { isMember },
        },
      });
    } catch (err) {
      this.logger.error(`Failed to record ChannelVerificationEvent: ${err.message}`);
    }

    return {
      isMember,
      status: member.status,
      details: member,
    };
  }

  async ensureUserIdentity(userCtx: TelegramUserCtx): Promise<{
    user: any;
    isNew: boolean;
  }> {
    let user = await this.prisma.user.findUnique({
      where: { telegramUserId: userCtx.id },
    });

    let isNew = false;
    if (!user) {
      user = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const newUser = await tx.user.create({
          data: {
            telegramUserId: userCtx.id,
            firstName: userCtx.firstName,
            lastName: userCtx.lastName,
            telegramUsername: userCtx.username,
            languageCode: userCtx.languageCode || 'en',
            photoUrl: userCtx.photoUrl,
            state: UserState.NEW,
            lastActiveAt: new Date(),
            lastLoginAt: new Date(),
            loginCount: 1,
            channelVerified: false,
          },
        });

        await tx.onboardingProgress.create({
          data: {
            telegramUserId: userCtx.id,
            currentStep: 'welcome',
            stepsCompleted: [],
          },
        });

        await tx.financialAccount.create({
          data: {
            telegramUserId: userCtx.id,
            status: 'ACTIVE',
            activatedAt: new Date(),
          },
        });

        const referralCode = `TS${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        await tx.referralCode.create({
          data: {
            telegramUserId: userCtx.id,
            code: referralCode,
            metadata: { generatedAt: new Date().toISOString() },
          },
        });

        await tx.userTrustProfile.create({
          data: {
            telegramUserId: userCtx.id,
            trustScore: 50,
            completedSettlements: 0,
            failedSettlements: 0,
            successRate: 100.0,
            accountAgeDays: 0,
            verificationStatus: 'UNVERIFIED',
          },
        });

        await tx.userLevelRecord.create({
          data: {
            telegramUserId: userCtx.id,
            currentLevel: 'NEW',
          },
        });

        await tx.notificationPreference.create({
          data: {
            telegramUserId: userCtx.id,
            telegramEnabled: true,
            inAppEnabled: true,
            marketingEnabled: false
          },
        });

        await this.auditService.createWithClient(tx, {
          telegramUserId: userCtx.id,
          eventType: AuditEventType.USER_CREATED,
          description: 'User created via Telegram Host Bot',
          metadata: { username: userCtx.username, firstName: userCtx.firstName },
        });

        return newUser;
      });

      isNew = true;
    } else {
      const updateData: any = {
        lastActiveAt: new Date(),
        loginCount: { increment: 1 },
      };
      if (userCtx.firstName) updateData.firstName = userCtx.firstName;
      if (userCtx.lastName) updateData.lastName = userCtx.lastName;
      if (userCtx.username) updateData.telegramUsername = userCtx.username;
      if (userCtx.languageCode) updateData.languageCode = userCtx.languageCode;
      if (userCtx.photoUrl) updateData.photoUrl = userCtx.photoUrl;

      user = await this.prisma.user.update({
        where: { telegramUserId: userCtx.id },
        data: updateData,
      });
    }

    return { user, isNew };
  }

  async processGateCheck(userCtx: TelegramUserCtx): Promise<{
    verified: boolean;
    message: string;
    keyboard: any;
  }> {
    const { user } = await this.ensureUserIdentity(userCtx);
    const { isMember } = await this.verifyChannelMembership(userCtx.id);

    if (isMember) {
      if (!user.channelVerified) {
        await this.prisma.user.update({
          where: { telegramUserId: userCtx.id },
          data: {
            channelVerified: true,
            channelVerifiedAt: new Date(),
          },
        });
      }

      // Check if user has made first deposit
      const hasDeposit = await this.prisma.paymentInvoice.findFirst({
        where: { telegramUserId: userCtx.id, status: 'PAID' },
      });

      const depositCheck = hasDeposit ? '✅' : '⬜';

      const welcomeText = `<b>Welcome to TitanStream 🚀</b>\n\n` +
        `Your Telegram-native financial account is active.\n\n` +
        `<b>Account Progress:</b>\n` +
        `✅ Join community channel\n` +
        `✅ Create account & identity\n` +
        `${depositCheck} Make your first deposit\n\n` +
        `Click below to launch the Mini App or explore features:`;

      return {
        verified: true,
        message: welcomeText,
        keyboard: {
          inline_keyboard: [
            [
              {
                text: '🚀 Open TitanStream Mini App',
                web_app: { url: this.webAppUrl },
              },
            ],
            [
              { text: '➕ Make First Deposit', callback_data: 'cmd_deposit' },
              { text: '📚 Learn How It Works', callback_data: 'edu_menu' },
            ],
          ],
        },
      };
    }

    const mainChan = this.requiredChannels[0];
    const channelLink = `https://t.me/${mainChan.username.replace('@', '')}`;
    return {
      verified: false,
      message: `<b>Welcome to TitanStream 🚀</b>\n\nA Telegram-native liquidity and financial platform.\n\nBefore continuing, join our official community channel:`,
      keyboard: {
        inline_keyboard: [
          [{ text: mainChan.label, url: channelLink }],
          [{ text: '🔄 Verify Membership', callback_data: 'verify_membership' }],
        ],
      },
    };
  }
}
