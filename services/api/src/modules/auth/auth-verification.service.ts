import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

export interface VerifiedUserPayload {
  telegramId: bigint;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium: boolean;
  authDate: Date;
  startParam?: string;
  photoUrl?: string;
}

@Injectable()
export class AuthVerificationService {
  private readonly botToken: string;
  private readonly maxInitDataSize = 4096;
  private readonly authDateToleranceSeconds = 300;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
  }

  verify(initData: string): VerifiedUserPayload {
    if (!initData || initData.length === 0) {
      throw new BadRequestException({ code: 'MALFORMED_INIT_DATA', message: 'initData is required' });
    }

    if (initData.length > this.maxInitDataSize) {
      throw new BadRequestException({ code: 'INIT_DATA_TOO_LARGE', message: 'initData exceeds maximum size' });
    }

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
      throw new BadRequestException({ code: 'MISSING_HASH', message: 'hash field is required in initData' });
    }

    const authDateStr = params.get('auth_date');
    if (!authDateStr) {
      throw new BadRequestException({ code: 'MISSING_AUTH_DATE', message: 'auth_date field is required' });
    }

    const authDate = parseInt(authDateStr, 10);
    if (isNaN(authDate)) {
      throw new BadRequestException({ code: 'INVALID_AUTH_DATE', message: 'auth_date must be a valid Unix timestamp' });
    }

    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > this.authDateToleranceSeconds) {
      throw new UnauthorizedException({ code: 'AUTH_DATE_EXPIRED', message: 'Authentication data is too old' });
    }

    const verified = this.verifySignature(initData, hash);
    if (!verified) {
      throw new UnauthorizedException({ code: 'INVALID_INIT_DATA', message: 'Telegram data verification failed' });
    }

    const idStr = params.get('id');
    if (!idStr) {
      throw new BadRequestException({ code: 'MISSING_USER_ID', message: 'User ID is required in initData' });
    }

    const telegramId = BigInt(idStr);
    const firstName = params.get('first_name') || 'User';
    const lastName = params.get('last_name') || undefined;
    const username = params.get('username') || undefined;
    const languageCode = params.get('language_code') || 'en';
    const isPremium = params.get('is_premium') === 'true';
    const startParam = params.get('start_param') || undefined;
    const photoUrl = params.get('photo_url') || undefined;

    return {
      telegramId,
      firstName,
      lastName,
      username,
      languageCode,
      isPremium,
      authDate: new Date(authDate * 1000),
      startParam,
      photoUrl,
    };
  }

  private verifySignature(initData: string, hash: string): boolean {
    const params = new URLSearchParams(initData);
    const keys = Array.from(params.keys()).filter((key) => key !== 'hash');
    keys.sort();

    const dataCheckString = keys
      .map((key) => `${key}=${params.get(key)}`)
      .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData')
      .update(this.botToken)
      .digest();

    const calculatedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (calculatedHash.length !== hash.length) return false;

    try {
      return timingSafeEqual(Buffer.from(calculatedHash), Buffer.from(hash));
    } catch {
      return false;
    }
  }
}
