import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { UserState } from '../../common/interfaces/user-state.enum';
import { requiredEnv } from '../../common/config/env.util';

@Injectable()
export class WebAuthSessionService {
  private readonly logger = new Logger(WebAuthSessionService.name);
  private readonly webAuthSessions = new Map<string, {
    status: 'PENDING' | 'AUTHENTICATED' | 'EXPIRED';
    data?: any;
    createdAt: number;
  }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

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

    const telegramUserIdBig = BigInt(telegramUser.id);
    let user: any = null;

    try {
      user = await this.prisma.user.findUnique({
        where: { telegramUserId: telegramUserIdBig },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            telegramUserId: telegramUserIdBig,
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
            telegramUsername: telegramUser.username,
            languageCode: telegramUser.language_code || 'en',
            photoUrl: telegramUser.photo_url,
            state: UserState.READY,
          },
        });
      }
    } catch (dbErr: any) {
      this.logger.warn(`[WEB_AUTH_FALLBACK] Database lookup failed: ${dbErr.message}`);
      user = {
        id: `fb_${telegramUser.id}`,
        telegramUserId: telegramUserIdBig,
        firstName: telegramUser.first_name || 'Titan',
        lastName: telegramUser.last_name || 'User',
        telegramUsername: telegramUser.username || 'titanuser',
        state: UserState.READY,
      };
    }

    const payload = {
      sub: String(telegramUser.id),
      telegramUserId: Number(telegramUser.id),
      state: user.state || 'READY',
      role: 'USER',
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(
      { sub: String(telegramUser.id), type: 'refresh' },
      { expiresIn: '30d', secret: process.env.JWT_REFRESH_SECRET || requiredEnv('JWT_REFRESH_SECRET', 'dev-refresh-secret') },
    );

    this.webAuthSessions.set(sessionCode, {
      status: 'AUTHENTICATED',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: String(user.id),
          telegramUserId: String(telegramUser.id),
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.telegramUsername,
          state: user.state,
        },
        isNewUser: false,
      },
      createdAt: session.createdAt,
    });

    this.logger.log(`Web auth session ${sessionCode} successfully authorized for Telegram ID ${telegramUser.id}`);
    return true;
  }
}
