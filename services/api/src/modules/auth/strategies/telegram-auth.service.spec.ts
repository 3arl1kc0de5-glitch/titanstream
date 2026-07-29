import { createHash, createHmac } from 'crypto';
import { TelegramAuthService } from './telegram-auth.service';

function signInitData(params: Record<string, string>, botToken = 'test_bot_token') {
  const dataCheckString = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return new URLSearchParams({ ...params, hash }).toString();
}

function signWebLoginPayload(payload: Record<string, string | number>, botToken = 'test_bot_token') {
  const dataCheckString = Object.keys(payload)
    .sort()
    .map((key) => `${key}=${payload[key]}`)
    .join('\n');
  const secretKey = createHash('sha256').update(botToken).digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return { ...payload, hash };
}

describe('TelegramAuthService', () => {
  const service = new TelegramAuthService('test_bot_token');

  it('validates and parses signed Telegram user payloads', () => {
    const initData = signInitData({
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({
        id: 123456789,
        first_name: 'Wendy',
        last_name: 'Doe',
        username: 'wendy',
        language_code: 'en',
        photo_url: 'https://example.test/avatar.jpg',
      }),
    });

    expect(service.verifyInitData(initData).isValid).toBe(true);
    expect(service.parseInitData(initData)).toEqual({
      telegramUserId: '123456789',
      firstName: 'Wendy',
      lastName: 'Doe',
      username: 'wendy',
      languageCode: 'en',
      photoUrl: 'https://example.test/avatar.jpg',
    });
  });

  it('rejects malformed and tampered payloads', () => {
    expect(service.verifyInitData('').isValid).toBe(false);

    const initData = signInitData({
      auth_date: String(Math.floor(Date.now() / 1000)),
      id: '1',
      first_name: 'Original',
    });

    expect(service.verifyInitData(initData.replace('Original', 'Changed')).isValid).toBe(false);
    expect(() => service.parseInitData(initData.replace('Original', 'Changed'))).toThrow();
  });

  it('validates and parses Telegram Login Widget payloads', () => {
    const payload = signWebLoginPayload({
      id: 123456789,
      first_name: 'Wendy',
      last_name: 'Doe',
      username: 'wendy',
      auth_date: Math.floor(Date.now() / 1000),
    });

    expect(service.parseWebLoginPayload(payload as any)).toEqual({
      telegramUserId: '123456789',
      firstName: 'Wendy',
      lastName: 'Doe',
      username: 'wendy',
      languageCode: 'en',
      photoUrl: undefined,
    });
  });

  it('rejects tampered Telegram Login Widget payloads', () => {
    const payload = signWebLoginPayload({
      id: 123456789,
      first_name: 'Wendy',
      auth_date: Math.floor(Date.now() / 1000),
    });

    expect(() => service.parseWebLoginPayload({ ...payload, first_name: 'Mallory' } as any)).toThrow();
  });
});
