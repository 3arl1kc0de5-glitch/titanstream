import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'crypto';

export interface TelegramInitDataUser {
  telegramUserId: string;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  photoUrl?: string;
  startParam?: string;
}

export interface TelegramWebLoginPayload {
  id: number | string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

@Injectable()
export class TelegramAuthService {
  private readonly maxInitDataSize = 4096;
  private readonly authDateToleranceSeconds = 30 * 86400; // 30 days tolerance for cached Telegram webviews

  constructor(private readonly botToken: string) {}

  verifyInitData(initData: string): { isValid: boolean; error?: string } {
    try {
      this.assertValid(initData);
      return { isValid: true };
    } catch (error: any) {
      return { isValid: false, error: error?.message ?? 'INVALID_INIT_DATA' };
    }
  }

  parseInitData(initData: string): TelegramInitDataUser | null {
    this.assertValid(initData);
    try {
      const params = new URLSearchParams(initData);
      const rawUser = params.get('user');
      const startParam = params.get('start_param') || undefined;

      if (rawUser) {
        const user = JSON.parse(rawUser);
        return {
          telegramUserId: String(user.id),
          firstName: user.first_name || 'User',
          lastName: user.last_name,
          username: user.username,
          languageCode: user.language_code || 'en',
          photoUrl: user.photo_url,
          startParam,
        };
      }

      const id = params.get('id');
      if (!id) return null;

      return {
        telegramUserId: id,
        firstName: params.get('first_name') || 'User',
        lastName: params.get('last_name') || undefined,
        username: params.get('username') || undefined,
        languageCode: params.get('language_code') || 'en',
        photoUrl: params.get('photo_url') || undefined,
        startParam,
      };
    } catch {
      throw new BadRequestException('MALFORMED_INIT_DATA_USER');
    }
  }

  parseWebLoginPayload(payload: TelegramWebLoginPayload): TelegramInitDataUser {
    if (!payload || !payload.id || !payload.hash || !payload.auth_date) {
      throw new BadRequestException('MALFORMED_WEB_LOGIN_PAYLOAD');
    }

    const isValid = this.verifyWebLoginSignature(payload);
    if (!isValid) {
      throw new UnauthorizedException('INVALID_WEB_LOGIN_SIGNATURE');
    }

    return {
      telegramUserId: String(payload.id),
      firstName: payload.first_name || 'User',
      lastName: payload.last_name,
      username: payload.username,
      languageCode: 'en',
      photoUrl: payload.photo_url,
    };
  }

  private assertValid(initData: string) {
    if (!this.botToken) {
      throw new UnauthorizedException('TELEGRAM_BOT_TOKEN_NOT_CONFIGURED');
    }

    if (!initData || initData.length > this.maxInitDataSize) {
      throw new BadRequestException('MALFORMED_INIT_DATA');
    }

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    const authDate = Number(params.get('auth_date'));
    if (!hash || !authDate || Number.isNaN(authDate)) {
      throw new BadRequestException('MALFORMED_INIT_DATA');
    }

    // Verify cryptographic HMAC signature first
    if (!this.verifySignature(params, hash)) {
      throw new UnauthorizedException('INVALID_INIT_DATA');
    }

    const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
    if (ageSeconds > this.authDateToleranceSeconds) {
      throw new UnauthorizedException('AUTH_DATE_EXPIRED');
    }
  }

  private verifySignature(params: URLSearchParams, hash: string): boolean {
    const dataCheckString = Array.from(params.keys())
      .filter((key) => key !== 'hash')
      .sort()
      .map((key) => `${key}=${params.get(key)}`)
      .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData').update(this.botToken).digest();
    const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    try {
      return calculatedHash.length === hash.length && timingSafeEqual(Buffer.from(calculatedHash), Buffer.from(hash));
    } catch {
      return false;
    }
  }

  private verifyWebLoginSignature(payload: TelegramWebLoginPayload): boolean {
    const { hash, ...data } = payload;
    const dataCheckString = Object.keys(data)
      .filter((key) => data[key as keyof typeof data] !== undefined && data[key as keyof typeof data] !== null)
      .sort()
      .map((key) => `${key}=${data[key as keyof typeof data]}`)
      .join('\n');

    const secretKey = createHash('sha256').update(this.botToken).digest();
    const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    try {
      return calculatedHash.length === hash.length && timingSafeEqual(Buffer.from(calculatedHash), Buffer.from(hash));
    } catch {
      return false;
    }
  }
}
