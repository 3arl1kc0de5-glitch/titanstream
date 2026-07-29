import { BadRequestException } from '@nestjs/common';
import { SettlementStatus } from '@prisma/client';
import { SettlementRiskService } from './settlement-risk.service';

describe('SettlementRiskService', () => {
  const prisma = {
    settlementSession: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  let service: SettlementRiskService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SettlementRiskService(prisma as any);
  });

  describe('evaluateUserRisk', () => {
    it('blocks new user first settlement exceeding $100', async () => {
      prisma.settlementSession.count.mockResolvedValue(0); // 0 completed txs

      const res = await service.evaluateUserRisk(123n, 150);
      expect(res.allowed).toBe(false);
      expect(res.riskCode).toBe('FIRST_TX_LIMIT_EXCEEDED');
    });

    it('allows new user first settlement under $100', async () => {
      prisma.settlementSession.count.mockResolvedValue(0);
      prisma.settlementSession.findMany.mockResolvedValue([]);
      prisma.settlementSession.findFirst.mockResolvedValue(null);

      const res = await service.evaluateUserRisk(123n, 80);
      expect(res.allowed).toBe(true);
    });

    it('blocks user if cumulative 24h volume exceeds tier limit', async () => {
      prisma.settlementSession.count.mockResolvedValueOnce(0); // completedCount = 0 (Tier 0)
      prisma.settlementSession.findMany.mockResolvedValueOnce([
        { expectedCryptoAmount: '200' },
      ]); // $200 already today

      const res = await service.evaluateUserRisk(123n, 80); // $200 + $80 = $280 > $250 limit
      expect(res.allowed).toBe(false);
      expect(res.riskCode).toBe('DAILY_LIMIT_EXCEEDED');
    });

    it('blocks user when hourly velocity exceeds max 3 sessions', async () => {
      prisma.settlementSession.count
        .mockResolvedValueOnce(0) // completedCount
        .mockResolvedValueOnce(3); // 3 sessions in past hour

      prisma.settlementSession.findMany.mockResolvedValueOnce([]);

      const res = await service.evaluateUserRisk(123n, 50);
      expect(res.allowed).toBe(false);
      expect(res.riskCode).toBe('HOURLY_VELOCITY_EXCEEDED');
    });

    it('blocks rapid requests within 30 seconds of last creation', async () => {
      prisma.settlementSession.count
        .mockResolvedValueOnce(0) // completedCount
        .mockResolvedValueOnce(1) // 1 in past hour
        .mockResolvedValueOnce(1); // 1 in past 24 hours

      prisma.settlementSession.findMany.mockResolvedValueOnce([]);
      prisma.settlementSession.findFirst.mockResolvedValueOnce({
        createdAt: new Date(Date.now() - 10 * 1000), // created 10s ago
      });

      const res = await service.evaluateUserRisk(123n, 50);
      expect(res.allowed).toBe(false);
      expect(res.riskCode).toBe('RAPID_SUBMISSION_BLOCKED');
    });
  });

  describe('evaluateMerchantCapacity', () => {
    it('blocks merchant assignment when 24h volume capacity is reached ($5000)', async () => {
      prisma.settlementSession.findMany.mockResolvedValue([
        { expectedCryptoAmount: '4800' },
      ]);

      const res = await service.evaluateMerchantCapacity('op_1', 300); // 4800 + 300 = 5100 > 5000
      expect(res.allowed).toBe(false);
      expect(res.riskCode).toBe('MERCHANT_DAILY_CAPACITY_EXCEEDED');
    });

    it('blocks merchant assignment when active assignments reach load limit (10)', async () => {
      prisma.settlementSession.findMany.mockResolvedValue([]);
      prisma.settlementSession.count.mockResolvedValue(10);

      const res = await service.evaluateMerchantCapacity('op_1', 50);
      expect(res.allowed).toBe(false);
      expect(res.riskCode).toBe('MERCHANT_LOAD_EXCEEDED');
    });

    it('allows merchant assignment when within daily volume and active load capacity', async () => {
      prisma.settlementSession.findMany.mockResolvedValue([{ expectedCryptoAmount: '1000' }]);
      prisma.settlementSession.count.mockResolvedValue(3);

      const res = await service.evaluateMerchantCapacity('op_1', 100);
      expect(res.allowed).toBe(true);
    });
  });

  describe('assertSessionCreationRisk', () => {
    it('throws BadRequestException when risk check fails', async () => {
      prisma.settlementSession.count.mockResolvedValue(0);

      await expect(service.assertSessionCreationRisk(123n, 200)).rejects.toThrow(BadRequestException);
    });
  });
});
