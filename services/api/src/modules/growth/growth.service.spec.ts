import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { FinancialOrchestratorService } from '../financial-orchestration/financial-orchestrator.service';
import { GrowthEventService } from './growth-event.service';
import { ReferralService } from './referral.service';
import { RewardService } from './reward.service';
import { TrustProfileService } from './trust-profile.service';
import { UserLevelService } from './user-level.service';
import { GrowthNotificationService } from './growth-notification.service';
import { GrowthEventType, ReferralStatus, RewardStatus, UserLevelTier } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('Stage 9 — Growth Engine Unit & Integration Tests', () => {
  let growthEventService: GrowthEventService;
  let referralService: ReferralService;
  let rewardService: RewardService;
  let trustProfileService: TrustProfileService;
  let userLevelService: UserLevelService;
  let notificationService: GrowthNotificationService;
  let orchestrator: FinancialOrchestratorService;

  const mockPrismaService = {
    growthEvent: {
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'evt_1', ...args.data })),
      findMany: jest.fn().mockResolvedValue([]),
    },
    referralCode: {
      findUnique: jest.fn(),
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'code_1', ...args.data })),
    },
    referralRelationship: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'rel_1', ...args.data })),
      update: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'rel_1', ...args.data })),
    },
    referralEvent: {
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'refevt_1', ...args.data })),
    },
    referralReward: {
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'refrw_1', ...args.data })),
    },
    rewardRule: {
      findUnique: jest.fn(),
      upsert: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'rule_1', ...args.create })),
    },
    reward: {
      findUnique: jest.fn(),
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'rw_1', ...args.data })),
      update: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'rw_1', ...args.data })),
      findMany: jest.fn().mockResolvedValue([]),
    },
    userTrustProfile: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'prof_1',
        telegramUserId: 100n,
        trustScore: 50,
        completedSettlements: 0,
        failedSettlements: 0,
        successRate: 100,
        accountAgeDays: 0,
        trustEvents: [],
      }),
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'profile_1', ...args.data, trustEvents: [] })),
      update: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'profile_1', ...args.data })),
    },
    trustEvent: {
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'tevt_1', ...args.data })),
    },
    userLevelConfig: {
      findMany: jest.fn().mockResolvedValue([
        { level: UserLevelTier.VERIFIED, name: 'Verified User', minAccountAgeDays: 1, minSuccessfulSettlements: 1, minTrustScore: 55, benefits: ['Boosted'], orderIndex: 2 },
        { level: UserLevelTier.NEW, name: 'New Explorer', minAccountAgeDays: 0, minSuccessfulSettlements: 0, minTrustScore: 0, benefits: ['Standard'], orderIndex: 1 },
      ]),
      upsert: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'cfg_1', ...args.create })),
    },
    userLevelRecord: {
      findUnique: jest.fn(),
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'lvl_1', ...args.data })),
      update: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'lvl_1', ...args.data })),
    },
    notificationTemplate: {
      findUnique: jest.fn().mockResolvedValue({
        code: 'SETTLEMENT_COMPLETED',
        titleTemplate: '✅ Settlement {amount}',
        bodyTemplate: 'Settled {amount} USDT via {provider}',
        enabled: true,
      }),
      upsert: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'tpl_1', ...args.create })),
    },
    notificationRecord: {
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'notif_1', ...args.data })),
      findMany: jest.fn().mockResolvedValue([]),
    },
    notificationPreference: {
      findUnique: jest.fn().mockResolvedValue({ telegramUserId: 100n, telegramEnabled: true, inAppEnabled: true }),
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'pref_1', ...args.data })),
      upsert: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'pref_1', ...args.update })),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        telegramUserId: 100n,
        firstName: 'Alice',
        isReady: true,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      }),
    },
    settlementSession: {
      count: jest.fn().mockImplementation((args) => {
        if (args?.where?.status === 'COMPLETED') return Promise.resolve(3);
        return Promise.resolve(0);
      }),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const mockFinancialOrchestrator = {
    requestOperation: jest.fn().mockResolvedValue({ id: 'op_financial_123', status: 'COMPLETED' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GrowthEventService,
        ReferralService,
        RewardService,
        TrustProfileService,
        UserLevelService,
        GrowthNotificationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: FinancialOrchestratorService, useValue: mockFinancialOrchestrator },
      ],
    }).compile();

    growthEventService = module.get<GrowthEventService>(GrowthEventService);
    referralService = module.get<ReferralService>(ReferralService);
    rewardService = module.get<RewardService>(RewardService);
    trustProfileService = module.get<TrustProfileService>(TrustProfileService);
    userLevelService = module.get<UserLevelService>(UserLevelService);
    notificationService = module.get<GrowthNotificationService>(GrowthNotificationService);
    orchestrator = module.get<FinancialOrchestratorService>(FinancialOrchestratorService);
  });

  describe('GrowthEventService', () => {
    it('should publish domain events and invoke registered listeners', async () => {
      const listener = jest.fn().mockResolvedValue(undefined);
      growthEventService.on(GrowthEventType.SETTLEMENT_COMPLETED, listener);

      const event = await growthEventService.publish({
        telegramUserId: 100n,
        eventType: GrowthEventType.SETTLEMENT_COMPLETED,
        payload: { amount: '100' },
      });

      expect(event).toBeDefined();
      expect(mockPrismaService.growthEvent.create).toHaveBeenCalled();
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('ReferralService', () => {
    it('should generate a valid referral code and Telegram link', async () => {
      mockPrismaService.referralCode.findUnique.mockResolvedValueOnce(null);

      const result = await referralService.getOrCreateReferralCode(100n);
      expect(result.code).toMatch(/^TS/);
      expect(result.referralLink).toContain('t.me/');
    });

    it('should reject self-referrals with BadRequestException', async () => {
      mockPrismaService.referralCode.findUnique.mockResolvedValueOnce({
        id: 'code_1',
        code: 'TS123456',
        telegramUserId: 100n,
      });

      await expect(referralService.registerReferral('TS123456', 100n)).rejects.toThrow(BadRequestException);
    });

    it('should register a new referral relationship', async () => {
      mockPrismaService.referralCode.findUnique.mockResolvedValueOnce({
        id: 'code_1',
        code: 'TS123456',
        telegramUserId: 100n,
      });
      mockPrismaService.referralRelationship.findUnique.mockResolvedValueOnce(null);

      const rel = await referralService.registerReferral('TS123456', 200n);
      expect(rel.referrerId).toBe(100n);
      expect(rel.refereeId).toBe(200n);
      expect(rel.status).toBe(ReferralStatus.REGISTERED);
    });
  });

  describe('RewardService & Financial Orchestrator Integration', () => {
    it('should create a PENDING reward', async () => {
      mockPrismaService.reward.findUnique.mockResolvedValueOnce(null);

      const reward = await rewardService.createReward({
        telegramUserId: 100n,
        rewardType: 'REFERRAL',
        amount: '5.000000',
        reference: 'ref_test_1',
      });

      expect(reward.status).toBe(RewardStatus.PENDING);
      expect(reward.amount).toBe('5.000000');
    });

    it('should disburse APPROVED reward via Financial Orchestrator double-entry engine', async () => {
      mockPrismaService.reward.findUnique.mockResolvedValueOnce({
        id: 'rw_999',
        telegramUserId: 100n,
        rewardType: 'REFERRAL',
        amount: '5.000000',
        assetCode: 'USDT',
        status: RewardStatus.PENDING,
        reference: 'ref_test_999',
      });

      const processed = await rewardService.approveAndDisburseReward('rw_999');

      expect(mockFinancialOrchestrator.requestOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          telegramUserId: 100n,
          operationType: 'SYSTEM_ALLOCATION',
          amount: '5.000000',
          idempotencyKey: 'reward_rw_999',
        }),
      );
      expect(processed.status).toBe(RewardStatus.PROCESSED);
    });
  });

  describe('TrustProfileService', () => {
    it('should calculate trust score accurately based on user activity', async () => {
      mockPrismaService.userTrustProfile.findUnique.mockResolvedValue({
        id: 'prof_1',
        telegramUserId: 100n,
        trustScore: 50,
        completedSettlements: 0,
        failedSettlements: 0,
        successRate: 100,
        accountAgeDays: 0,
        trustEvents: [],
      });

      const profile = await trustProfileService.recalculateTrustScore(100n);

      expect(profile.trustScore).toBeGreaterThanOrEqual(50);
      expect(mockPrismaService.userTrustProfile.update).toHaveBeenCalled();
    });
  });

  describe('UserLevelService', () => {
    it('should evaluate user level tier based on trust score and settlement history', async () => {
      mockPrismaService.userLevelRecord.findUnique.mockResolvedValueOnce({
        id: 'lvl_1',
        telegramUserId: 100n,
        currentLevel: UserLevelTier.NEW,
      });

      mockPrismaService.userTrustProfile.findUnique.mockResolvedValue({
        id: 'prof_1',
        telegramUserId: 100n,
        trustScore: 75,
        completedSettlements: 5,
        failedSettlements: 0,
        successRate: 100,
        accountAgeDays: 10,
        trustEvents: [],
      });

      const updatedRecord = await userLevelService.evaluateUserLevel(100n);

      expect(updatedRecord.currentLevel).toBe(UserLevelTier.VERIFIED);
    });
  });

  describe('GrowthNotificationService', () => {
    it('should format and dispatch Telegram notifications', async () => {
      const notif = await notificationService.sendNotification({
        telegramUserId: 100n,
        templateCode: 'SETTLEMENT_COMPLETED',
        variables: { amount: '500', provider: 'Merchant' },
      });

      expect(notif).toBeDefined();
      expect(mockPrismaService.notificationRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          telegramUserId: 100n,
          templateCode: 'SETTLEMENT_COMPLETED',
        }),
      });
    });
  });
});
