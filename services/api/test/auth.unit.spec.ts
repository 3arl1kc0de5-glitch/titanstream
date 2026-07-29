import { Test, TestingModule } from '@nestjs/testing';
import { TelegramAuthService } from '../src/modules/auth/strategies/telegram-auth.service';

describe('TelegramAuthService', () => {
  let service: TelegramAuthService;

  beforeAll(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'test_bot_token';
    service = new TelegramAuthService('test_bot_token');
  });

  describe('verifyInitData', () => {
    it('should return false for empty initData', () => {
      const result = service.verifyInitData('');
      expect(result.isValid).toBe(false);
    });

    it('should return false for malformed initData', () => {
      const result = service.verifyInitData('not-a-query-string');
      expect(result.isValid).toBe(false);
    });

    it('should return false for initData without hash', () => {
      const result = service.verifyInitData('user=%7B%7D&auth_date=1000000');
      expect(result.isValid).toBe(false);
    });

    it('should not crash on very long initData', () => {
      const longData = 'a'.repeat(10000);
      const result = service.verifyInitData(longData);
      expect(result.isValid).toBe(false);
    });
  });

  describe('parseInitData', () => {
    it('should throw for invalid initData', () => {
      expect(() => service.parseInitData('invalid')).toThrow();
    });
  });
});
