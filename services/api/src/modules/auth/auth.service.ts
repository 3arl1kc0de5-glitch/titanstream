import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { TelegramAuthService } from './strategies/telegram-auth.service';
import { UserState, AuditEventType } from '../../common/interfaces/user-state.enum';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly telegramAuth: TelegramAuthService,
    private readonly auditService: AuditService,
  ) {}

  async authenticate(initData: string, ipAddress?: string, userAgent?: string) {
    this.logger.log(`[TELEGRAM_AUTH_TELEMETRY] 1. InitData Payload Received (len: ${initData?.length ?? 0})`);
    const parsed = this.telegramAuth.parseInitData(initData);
    if (!parsed) {
      this.logger.error(`[TELEGRAM_AUTH_TELEMETRY] 2. Signature Validation: FAILED — INVALID_INIT_DATA`);
      throw new UnauthorizedException('INVALID_INIT_DATA');
    }

    this.logger.log(`[TELEGRAM_AUTH_TELEMETRY] 2. Signature Validation: SUCCESS — User ID ${parsed.telegramUserId}`);
    return this.processUserAuthentication(parsed, ipAddress, userAgent);
  }

  async authenticateWebLogin(payload: any, ipAddress?: string, userAgent?: string) {
    this.logger.log(`[TELEGRAM_AUTH_TELEMETRY] 1. Web Login Payload Received for ID ${payload?.id}`);
    const parsed = this.telegramAuth.parseWebLoginPayload(payload);
    this.logger.log(`[TELEGRAM_AUTH_TELEMETRY] 2. Web Login Signature Validation: SUCCESS — User ID ${parsed.telegramUserId}`);
    return this.processUserAuthentication(parsed, ipAddress, userAgent);
  }

  private async processUserAuthentication(parsed: any, ipAddress?: string, userAgent?: string) {
    const { telegramUserId, firstName, lastName, username, languageCode, photoUrl } = parsed;
    const telegramUserIdBig = BigInt(telegramUserId);

    let user = await this.prisma.user.findUnique({
      where: { telegramUserId: telegramUserIdBig },
    });

    let isNewUser = false;
    if (!user) {
      this.logger.log(`[TELEGRAM_AUTH_TELEMETRY] 3. User Lookup: NEW USER — Creating record for ID ${telegramUserId}`);
      user = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            telegramUserId: telegramUserIdBig,
            firstName,
            lastName,
            telegramUsername: username,
            languageCode: languageCode || 'en',
            photoUrl,
            state: UserState.NEW,
            lastActiveAt: new Date(),
            lastLoginAt: new Date(),
            lastActiveIp: ipAddress,
            loginCount: 1,
          },
        });

        await tx.onboardingProgress.create({
          data: {
            telegramUserId: telegramUserIdBig,
            currentStep: 'welcome',
            stepsCompleted: [],
          },
        });

        await tx.financialAccount.create({
          data: {
            telegramUserId: telegramUserIdBig,
            status: 'ACTIVE',
            activatedAt: new Date(),
          },
        });

        const referralCode = `TS${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        await tx.referralCode.create({
          data: {
            telegramUserId: telegramUserIdBig,
            code: referralCode,
            metadata: { generatedAt: new Date().toISOString() },
          },
        });

        await tx.userTrustProfile.create({
          data: {
            telegramUserId: telegramUserIdBig,
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
            telegramUserId: telegramUserIdBig,
            currentLevel: 'NEW',
          },
        });

        await tx.notificationPreference.create({
          data: {
            telegramUserId: telegramUserIdBig,
            telegramEnabled: true,
            inAppEnabled: true,
            marketingEnabled: false,
          },
        });

        await this.auditService.createWithClient(tx, {
          telegramUserId: telegramUserIdBig,
          eventType: AuditEventType.USER_CREATED,
          description: 'New user registered via Telegram Mini App',
          ipAddress,
          userAgent,
          metadata: { username, firstName },
        });

        return newUser;
      });

      isNewUser = true;
    } else {
      const updateData: any = {
        lastActiveAt: new Date(),
        lastLoginAt: new Date(),
        lastActiveIp: ipAddress,
        loginCount: { increment: 1 },
      };

      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (username) updateData.telegramUsername = username;
      if (languageCode) updateData.languageCode = languageCode;
      if (photoUrl) updateData.photoUrl = photoUrl;

      user = await this.prisma.user.update({
        where: { telegramUserId: telegramUserIdBig },
        data: updateData,
      });
    }

    await this.auditService.create({
      telegramUserId: telegramUserIdBig,
      eventType: AuditEventType.USER_AUTHENTICATED,
      description: isNewUser ? 'First time authentication' : 'Returning user authentication',
      ipAddress,
      userAgent,
      metadata: { isNewUser },
    });

    const { isReady, readiness } = await this.evaluateReadiness(telegramUserIdBig);

    const payload = {
      sub: String(telegramUserId),
      telegramUserId: Number(telegramUserId),
      state: user.state,
      role: 'USER',
    };

    if (user.state === UserState.NEW) {
      user = await this.transitionUserState(telegramUserIdBig, UserState.AUTHENTICATED, 'Auto-transition on auth');
    }

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(
      { sub: String(telegramUserId), type: 'refresh' },
      { expiresIn: '30d', secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret' },
    );

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
      onboarding: {
        currentStep: isNewUser ? 'welcome' : await this.getCurrentOnboardingStep(telegramUserIdBig),
        isCompleted: user.state === UserState.ELIGIBLE_USER || user.state === UserState.ACTIVE_USER,
      },
      readiness,
      isNewUser,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      });
      const telegramUserId = BigInt(payload.sub);

      const user = await this.prisma.user.findUnique({
        where: { telegramUserId },
      });
      if (!user) throw new UnauthorizedException('USER_NOT_FOUND');

      const newPayload = {
        sub: String(telegramUserId),
        telegramUserId: Number(telegramUserId),
        state: user.state,
        role: 'USER',
      };

      const newAccessToken = this.jwtService.sign(newPayload, { expiresIn: '15m' });
      const newRefreshToken = this.jwtService.sign(
        { sub: String(telegramUserId), type: 'refresh' },
        { expiresIn: '30d', secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret' },
      );

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch {
      throw new UnauthorizedException('TOKEN_EXPIRED');
    }
  }

  async getProfile(telegramUserId: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { telegramUserId },
      include: {
        onboardingProgress: true,
        educationCompletions: true,
        userConsents: true,
        readinessScores: true,
      },
    });
    if (!user) throw new UnauthorizedException('USER_NOT_FOUND');
    return {
      user: this.sanitizeUser(user),
      onboarding: user.onboardingProgress,
      education: user.educationCompletions,
      consents: user.userConsents,
      readiness: user.readinessScores,
    };
  }

  private async evaluateReadiness(telegramUserId: bigint) {
    const readiness = await this.prisma.readinessScore.findUnique({
      where: { telegramUserId },
    });
    return {
      isReady: readiness?.isReady ?? false,
      readiness: readiness || null,
    };
  }

  private async transitionUserState(telegramUserId: bigint, newState: UserState, reason: string) {
    const user = await this.prisma.user.findUnique({ where: { telegramUserId } });
    if (!user) throw new Error('User not found');

    const updatedUser = await this.prisma.user.update({
      where: { telegramUserId },
      data: { state: newState },
    });

    await this.prisma.userStateTransition.create({
      data: {
        telegramUserId,
        fromState: user.state as UserState,
        toState: newState,
        reason,
        triggerEvent: 'auth_service',
      },
    });

    await this.auditService.create({
      telegramUserId,
      eventType: AuditEventType.USER_STATE_CHANGED,
      description: `State transition: ${user.state} -> ${newState}`,
      metadata: { fromState: user.state, toState: newState, reason },
    });

    return updatedUser;
  }

  private async getCurrentOnboardingStep(telegramUserId: bigint): Promise<string> {
    const progress = await this.prisma.onboardingProgress.findUnique({
      where: { telegramUserId },
    });
    return progress?.currentStep || 'welcome';
  }

  private sanitizeUser(user: any) {
    return {
      telegramUserId: Number(user.telegramUserId),
      telegramUsername: user.telegramUsername,
      firstName: user.firstName,
      lastName: user.lastName,
      photoUrl: user.photoUrl,
      languageCode: user.languageCode,
      state: user.state,
      isReady: user.isReady,
      createdAt: user.createdAt,
    };
  }
}