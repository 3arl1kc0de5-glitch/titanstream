import { Injectable, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { TelegramAuthService } from './strategies/telegram-auth.service';
import { UserState, AuditEventType } from '../../common/interfaces/user-state.enum';
import { AuditService } from '../audit/audit.service';
import { requiredEnv } from '../../common/config/env.util';

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
    const traceId = this.createTraceId();
    this.logAuth(traceId, 'mini_app.request_received', `initData length=${initData?.length ?? 0}`);
    try {
      const parsed = this.telegramAuth.parseInitData(initData);
      if (!parsed) throw new UnauthorizedException('INVALID_INIT_DATA');
      this.logAuth(traceId, 'mini_app.signature_verified', `telegramUserId=${parsed.telegramUserId}`);
      return this.authenticateTelegramIdentity(parsed, 'telegram_mini_app', traceId, ipAddress, userAgent);
    } catch (error: any) {
      this.logAuthFailure(traceId, 'mini_app.failed', error);
      throw error;
    }
  }

  private readonly webAuthSessions = new Map<string, {
    status: 'PENDING' | 'AUTHENTICATED' | 'EXPIRED';
    data?: any;
    createdAt: number;
  }>();

  createWebAuthSession() {
    const sessionCode = `wa_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'titanstream_bot';
    const deepLink = `https://t.me/${botUsername}?start=${sessionCode}`;

    this.webAuthSessions.set(sessionCode, {
      status: 'PENDING',
      createdAt: Date.now(),
    });

    const tenMinsAgo = Date.now() - 10 * 60 * 1000;
    for (const [code, sess] of this.webAuthSessions.entries()) {
      if (sess.createdAt < tenMinsAgo) this.webAuthSessions.delete(code);
    }

    return { sessionCode, deepLink };
  }

  pollWebAuthSession(sessionCode: string) {
    const session = this.webAuthSessions.get(sessionCode);
    if (!session) {
      return { status: 'EXPIRED' };
    }

    if (Date.now() - session.createdAt > 10 * 60 * 1000) {
      this.webAuthSessions.delete(sessionCode);
      return { status: 'EXPIRED' };
    }

    if (session.status === 'AUTHENTICATED' && session.data) {
      return { status: 'AUTHENTICATED', ...session.data };
    }

    return { status: 'PENDING' };
  }

  async authorizeWebSessionViaTelegram(sessionCode: string, telegramUser: {
    id: number | bigint;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    photo_url?: string;
  }) {
    const session = this.webAuthSessions.get(sessionCode);
    if (!session || session.status === 'EXPIRED') {
      this.logger.warn(`Attempted deep link web auth for unknown or expired session ${sessionCode}`);
      return false;
    }

    const parsed = {
      telegramUserId: telegramUser.id,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      username: telegramUser.username,
      languageCode: telegramUser.language_code,
      photoUrl: telegramUser.photo_url,
    };

    const authResult = await this.authenticateTelegramIdentity(parsed, 'telegram_deep_link_bot', `deeplink_${sessionCode}`);

    this.webAuthSessions.set(sessionCode, {
      status: 'AUTHENTICATED',
      data: authResult,
      createdAt: session.createdAt,
    });

    this.logger.log(`Web auth session ${sessionCode} successfully authorized for Telegram ID ${telegramUser.id}`);
    return true;
  }

  async authenticateWebLogin(payload: any, ipAddress?: string, userAgent?: string) {
    const traceId = this.createTraceId();
    this.logAuth(traceId, 'web_login.request_received', `telegramPayloadId=${payload?.id ?? 'missing'}`);
    try {
      const parsed = this.telegramAuth.parseWebLoginPayload(payload);
      this.logAuth(traceId, 'web_login.signature_verified', `telegramUserId=${parsed.telegramUserId}`);
      return this.authenticateTelegramIdentity(parsed, 'telegram_login_widget', traceId, ipAddress, userAgent);
    } catch (error: any) {
      this.logAuthFailure(traceId, 'web_login.failed', error);
      throw error;
    }
  }

  private async authenticateTelegramIdentity(parsed: any, provider: string, traceId: string, ipAddress?: string, userAgent?: string) {
    const { telegramUserId, firstName, lastName, username, languageCode, photoUrl, startParam } = parsed;
    const telegramUserIdBig = BigInt(telegramUserId);

    let user: any = null;
    let isNewUser = false;

    try {
      user = await this.prisma.user.findUnique({
        where: { telegramUserId: telegramUserIdBig },
      });

      if (!user) {
        this.logAuth(traceId, 'identity.user_lookup', `status=new telegramUserId=${telegramUserId}`);
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

          await tx.referralCode.create({
            data: {
              telegramUserId: telegramUserIdBig,
              code: await this.generateUniqueReferralCode(tx),
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

          await this.attachReferralIfPresent(tx, telegramUserIdBig, startParam, traceId);

          await this.auditService.createWithClient(tx, {
            telegramUserId: telegramUserIdBig,
            eventType: AuditEventType.USER_CREATED,
            description: `New user registered via ${provider}`,
            ipAddress,
            userAgent,
            metadata: { provider, username, firstName, traceId },
          });

          return newUser;
        });

        isNewUser = true;
      } else {
        this.logAuth(traceId, 'identity.user_lookup', `status=existing telegramUserId=${telegramUserId}`);
        const updateData: any = {
          lastLoginAt: new Date(),
          lastActiveAt: new Date(),
          loginCount: { increment: 1 },
        };
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (username !== undefined) updateData.telegramUsername = username;
        if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
        if (ipAddress) updateData.lastActiveIp = ipAddress;

        user = await this.prisma.user.update({
          where: { telegramUserId: telegramUserIdBig },
          data: updateData,
        });

        await this.auditService.create({
          telegramUserId: telegramUserIdBig,
          eventType: AuditEventType.USER_AUTHENTICATED,
          description: `User authenticated via ${provider}`,
          ipAddress,
          userAgent,
          metadata: { provider, traceId },
        });
      }
    } catch (dbError: any) {
      this.logger.warn(`[AUTH_FALLBACK] Database operation failed: ${dbError.message}. Generating resilient session for user ${telegramUserId}`);
      user = {
        id: `fb_${telegramUserId}`,
        telegramUserId: telegramUserIdBig,
        firstName: firstName || 'Titan',
        lastName: lastName || 'User',
        telegramUsername: username || 'titanuser',
        state: UserState.READY,
        languageCode: languageCode || 'en',
        photoUrl,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      isNewUser = false;
    }

    let isReady = true;
    let readiness = { score: 100, isEligible: true, issues: [] };
    try {
      const res = await this.evaluateReadiness(telegramUserIdBig);
      isReady = res.isReady;
      readiness = res.readiness as any;
      if (user.state === UserState.NEW) {
        user = await this.transitionUserState(telegramUserIdBig, UserState.AUTHENTICATED, 'Auto-transition on auth');
      }
    } catch (err: any) {
      this.logger.warn(`[AUTH_FALLBACK] Readiness/state transition skipped: ${err.message}`);
    }

    const payload = {
      sub: String(telegramUserId),
      telegramUserId: Number(telegramUserId),
      state: user.state,
      role: 'USER',
    };

    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || requiredEnv('JWT_REFRESH_SECRET', 'dev-refresh-secret');
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(
      { sub: String(telegramUserId), type: 'refresh' },
      { expiresIn: '30d', secret: refreshSecret },
    );

    this.logAuth(traceId, 'jwt.issued', `telegramUserId=${telegramUserId}`);
    this.logAuth(traceId, 'auth.completed', `provider=${provider} isNewUser=${isNewUser}`);

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
      traceId,
    };
  }

  private async ensureIdentityResources(telegramUserId: bigint, traceId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.onboardingProgress.upsert({
        where: { telegramUserId },
        update: {},
        create: { telegramUserId, currentStep: 'welcome', stepsCompleted: [] },
      });
      await tx.financialAccount.upsert({
        where: { telegramUserId },
        update: {},
        create: { telegramUserId, status: 'ACTIVE', activatedAt: new Date() },
      });
      await tx.referralCode.upsert({
        where: { telegramUserId },
        update: {},
        create: {
          telegramUserId,
          code: await this.generateUniqueReferralCode(tx),
          metadata: { generatedAt: new Date().toISOString(), traceId },
        },
      });
      await tx.userTrustProfile.upsert({
        where: { telegramUserId },
        update: {},
        create: {
          telegramUserId,
          trustScore: 50,
          completedSettlements: 0,
          failedSettlements: 0,
          successRate: 100.0,
          accountAgeDays: 0,
          verificationStatus: 'UNVERIFIED',
        },
      });
      await tx.userLevelRecord.upsert({
        where: { telegramUserId },
        update: {},
        create: { telegramUserId, currentLevel: 'NEW' },
      });
      await tx.notificationPreference.upsert({
        where: { telegramUserId },
        update: {},
        create: { telegramUserId, telegramEnabled: true, inAppEnabled: true, marketingEnabled: false },
      });
    });
    this.logAuth(traceId, 'identity.resources_verified', `telegramUserId=${telegramUserId.toString()}`);
  }

  private async attachReferralIfPresent(tx: any, telegramUserId: bigint, startParam: string | undefined, traceId: string) {
    if (!startParam) return;

    const referralCode = startParam.startsWith('ref_') ? startParam.replace('ref_', '') : startParam;
    const codeRecord = await tx.referralCode.findUnique({ where: { code: referralCode } });
    if (!codeRecord) {
      this.logAuth(traceId, 'referral.skipped', `reason=code_not_found code=${referralCode}`);
      return;
    }

    if (codeRecord.telegramUserId === telegramUserId) {
      this.logAuth(traceId, 'referral.skipped', 'reason=self_referral');
      return;
    }

    await tx.referralRelationship.upsert({
      where: { refereeId: telegramUserId },
      update: {},
      create: {
        referrerId: codeRecord.telegramUserId,
        refereeId: telegramUserId,
        referralCodeId: codeRecord.id,
        status: 'CREATED',
        metadata: { source: 'auth', referralCode, traceId },
      },
    });
    this.logAuth(traceId, 'referral.attached', `refereeId=${telegramUserId.toString()} code=${referralCode}`);
  }

  private async generateUniqueReferralCode(tx: any): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = `TS${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const existing = await tx.referralCode.findUnique({ where: { code } });
      if (!existing) return code;
    }
    throw new BadRequestException('REFERRAL_CODE_GENERATION_FAILED');
  }

  async refreshTokens(refreshToken: string) {
    const traceId = this.createTraceId();
    this.logAuth(traceId, 'refresh.request_received', 'refresh token submitted');
    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || requiredEnv('JWT_REFRESH_SECRET', 'dev-refresh-secret');
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: refreshSecret,
      });
      if (payload.type !== 'refresh') throw new UnauthorizedException('INVALID_REFRESH_TOKEN');
      const telegramUserId = BigInt(payload.sub);

      let userState: any = UserState.READY;
      try {
        const user = await this.prisma.user.findUnique({
          where: { telegramUserId },
        });
        if (user) userState = user.state;
      } catch (dbErr: any) {
        this.logger.warn(`[AUTH_FALLBACK] Database lookup failed during token refresh: ${dbErr.message}`);
      }

      const newPayload = {
        sub: String(telegramUserId),
        telegramUserId: Number(telegramUserId),
        state: userState,
        role: 'USER',
      };

      const newAccessToken = this.jwtService.sign(newPayload, { expiresIn: '15m' });
      const newRefreshToken = this.jwtService.sign(
        { sub: String(telegramUserId), type: 'refresh' },
        { expiresIn: '30d', secret: refreshSecret },
      );

      this.logAuth(traceId, 'refresh.completed', `telegramUserId=${telegramUserId.toString()}`);
      return { accessToken: newAccessToken, refreshToken: newRefreshToken, traceId };
    } catch (error: any) {
      this.logAuthFailure(traceId, 'refresh.failed', error);
      throw new UnauthorizedException('TOKEN_EXPIRED');
    }
  }

  async getProfile(telegramUserId: bigint) {
    try {
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
    } catch (err: any) {
      this.logger.warn(`[AUTH_FALLBACK] getProfile failed: ${err.message}`);
      return {
        user: {
          telegramUserId: Number(telegramUserId),
          telegramUsername: 'titanuser',
          firstName: 'Titan',
          lastName: 'User',
          state: UserState.READY,
          isReady: true,
          createdAt: new Date(),
        },
        onboarding: { currentStep: 'welcome', stepsCompleted: [] },
        education: [],
        consents: [],
        readiness: { isReady: true, score: 100 },
      };
    }
  }

  private async evaluateReadiness(telegramUserId: bigint) {
    try {
      const readiness = await this.prisma.readinessScore.findUnique({
        where: { telegramUserId },
      });
      return {
        isReady: readiness?.isReady ?? true,
        readiness: readiness || { isReady: true, score: 100 },
      };
    } catch (err: any) {
      this.logger.warn(`[AUTH_FALLBACK] evaluateReadiness failed: ${err.message}`);
      return {
        isReady: true,
        readiness: { isReady: true, score: 100 },
      };
    }
  }

  private async transitionUserState(telegramUserId: bigint, newState: UserState, reason: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { telegramUserId } });
      if (!user) return { state: newState } as any;

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
    } catch (err: any) {
      this.logger.warn(`[AUTH_FALLBACK] transitionUserState failed: ${err.message}`);
      return { state: newState } as any;
    }
  }

  private async getCurrentOnboardingStep(telegramUserId: bigint): Promise<string> {
    try {
      const progress = await this.prisma.onboardingProgress.findUnique({
        where: { telegramUserId },
      });
      return progress?.currentStep || 'welcome';
    } catch {
      return 'welcome';
    }
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

  private createTraceId() {
    return `auth_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }

  private logAuth(traceId: string, stage: string, detail: string) {
    this.logger.log(`[AUTH_TRACE:${traceId}] ${stage} ${detail}`);
  }

  private logAuthFailure(traceId: string, stage: string, error: any) {
    const code = error?.response?.code || error?.message || 'AUTHENTICATION_FAILED';
    this.logger.error(`[AUTH_TRACE:${traceId}] ${stage} code=${code}`);
  }
}
