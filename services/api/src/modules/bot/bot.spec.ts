import { Test, TestingModule } from '@nestjs/testing';
import { TelegramClientService } from './telegram-client.service';
import { BotGateService } from './bot-gate.service';
import { BotCommandService } from './bot-command.service';
import { BotAssistantService } from './bot-assistant.service';
import { BotAdminService } from './bot-admin.service';
import { BotNotificationService } from './bot-notification.service';
import { BotBroadcastService } from './bot-broadcast.service';
import { BotAnalyticsService } from './bot-analytics.service';
import { BotPaymentService } from './bot-payment.service';
import { BotWithdrawalService } from './bot-withdrawal.service';
import { BotMonetizationService } from './bot-monetization.service';
import { BotDispatcherService } from './bot-dispatcher.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReferralService } from '../growth/referral.service';
import { BalanceService } from '../financial/balance.service';
import { UserLevelService } from '../growth/user-level.service';
import { SupportService } from '../admin/services/support.service';
import { WithdrawalService } from '../financial/withdrawal.service';
import { FinancialOrchestratorService } from '../financial-orchestration/financial-orchestrator.service';

describe('Telegram Host Bot Production Suite', () => {
  let gateService: BotGateService;
  let commandService: BotCommandService;
  let assistantService: BotAssistantService;
  let adminService: BotAdminService;
  let paymentService: BotPaymentService;
  let withdrawalService: BotWithdrawalService;
  let monetizationService: BotMonetizationService;
  let dispatcherService: BotDispatcherService;

  const mockUser = {
    telegramUserId: BigInt(123456),
    firstName: 'TestUser',
    telegramUsername: 'testuser',
    channelVerified: true,
    state: 'READY',
    isReady: true,
    financialAccount: { id: 'fa_123' },
  };

  const mockInvoice = {
    id: 'inv_1',
    telegramUserId: BigInt(123456),
    provider: 'CRYPTOBOT',
    externalInvoiceId: 'INV-123456789',
    asset: 'USDT',
    amount: '50.00',
    payUrl: 'https://t.me/CryptoBot?start=IV123456789',
    status: 'WAITING_FOR_PAYMENT',
    user: mockUser,
  };

  const mockEmergencyState = {
    id: 'SYSTEM_EMERGENCY_STATE',
    depositsPaused: false,
    withdrawalsPaused: false,
    rewardsPaused: false,
    updatedBy: 'system',
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn().mockResolvedValue(mockUser),
      create: jest.fn().mockResolvedValue(mockUser),
      update: jest.fn().mockResolvedValue(mockUser),
      count: jest.fn().mockResolvedValue(10),
    },
    onboardingProgress: {
      create: jest.fn(),
    },
    channelVerificationEvent: {
      create: jest.fn().mockResolvedValue({ id: 'evt_1' }),
    },
    paymentInvoice: {
      create: jest.fn().mockResolvedValue(mockInvoice),
      findUnique: jest.fn().mockResolvedValue(mockInvoice),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ ...mockInvoice, status: 'PAID' }),
    },
    emergencyControlState: {
      findUnique: jest.fn().mockResolvedValue(mockEmergencyState),
      create: jest.fn().mockResolvedValue(mockEmergencyState),
      update: jest.fn().mockResolvedValue(mockEmergencyState),
    },
    productSubscription: {
      create: jest.fn().mockResolvedValue({ id: 'sub_1' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    financialAccount: {
      create: jest.fn().mockResolvedValue({ id: 'fa_123' }),
    },
    transactionGroup: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'txg_1' }),
    },
    ledgerAccount: {
      findUnique: jest.fn().mockResolvedValue({ id: 'la_1', code: 'USER_ASSET_LIABILITY' }),
      create: jest.fn().mockResolvedValue({ id: 'la_1', code: 'USER_ASSET_LIABILITY' }),
    },
    ledgerEntry: {
      create: jest.fn().mockResolvedValue({ id: 'le_1' }),
    },
    settlementSession: {
      count: jest.fn().mockResolvedValue(2),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ referenceCode: 'WD-1001', requestedAmount: 50 }),
    },
    supportCase: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    riskEvent: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    asset: {
      findMany: jest.fn().mockResolvedValue([{ symbol: 'USDT', enabled: true }]),
    },
    notificationRecord: {
      create: jest.fn().mockResolvedValue({ id: 'notif_1' }),
    },
    botBroadcast: {
      create: jest.fn().mockResolvedValue({ id: 'b_1' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    referralRelationship: {
      count: jest.fn().mockResolvedValue(3),
    },
  };

  const mockAuditService = {
    create: jest.fn().mockResolvedValue({}),
  };

  const mockReferralService = {
    registerReferral: jest.fn().mockResolvedValue({ id: 'ref_rel_1' }),
    getUserReferralSummary: jest.fn().mockResolvedValue({
      referralCode: 'TS123456',
      referralLink: 'https://t.me/titanstream_bot?start=ref_TS123456',
      totalInvited: 3,
      qualifiedCount: 1,
      totalEarnedUSDT: 5,
      referrals: [],
    }),
  };

  const mockBalanceService = {
    getBalances: jest.fn().mockResolvedValue({
      financialAccountId: 'fa_1',
      balances: [{ assetCode: 'USDT', availableBalance: '250.00' }],
    }),
  };

  const mockUserLevelService = {
    getUserLevel: jest.fn().mockResolvedValue({ currentLevel: 'VERIFIED' }),
    getUserLevelSummary: jest.fn().mockResolvedValue({
      currentLevel: 'VERIFIED',
      levelName: 'Verified Member',
    }),
  };

  const mockSupportService = {
    createCase: jest.fn().mockResolvedValue({
      id: 'CASE-1001',
      category: 'PAYMENT_ISSUE',
      priority: 'HIGH',
      status: 'OPEN',
    }),
  };

  const mockTelegramClient = {
    getChatMember: jest.fn().mockResolvedValue({
      status: 'member',
      user: { id: 123456, is_bot: false, first_name: 'TestUser' },
    }),
    sendMessage: jest.fn().mockResolvedValue({ ok: true, message_id: 100 }),
    answerCallbackQuery: jest.fn().mockResolvedValue({ ok: true }),
    setWebhook: jest.fn().mockResolvedValue({ ok: true }),
  };

  const mockWithdrawalService = {
    initiateWithdrawal: jest.fn().mockResolvedValue({
      id: 'sess_wd_1',
      referenceCode: 'WD-1001',
      requestedAmount: 50,
      providerMetadata: { requiresManualReview: false },
    }),
    approveWithdrawal: jest.fn(),
    rejectWithdrawal: jest.fn(),
    dispatchPayout: jest.fn(),
    getUserWithdrawalHistory: jest.fn(),
  };

  const mockOrchestratorService = {
    executeOperation: jest.fn().mockResolvedValue({ status: 'COMPLETED', operationId: 'op_1' }),
    requestOperation: jest.fn().mockResolvedValue({ status: 'COMPLETED', operationId: 'op_1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: TelegramClientService, useValue: mockTelegramClient },
        BotGateService,
        BotCommandService,
        BotAssistantService,
        BotAdminService,
        BotNotificationService,
        BotBroadcastService,
        BotAnalyticsService,
        BotPaymentService,
        BotWithdrawalService,
        BotMonetizationService,
        BotDispatcherService,
        { provide: WithdrawalService, useValue: mockWithdrawalService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuditService, useValue: mockAuditService },
        { provide: ReferralService, useValue: mockReferralService },
        { provide: BalanceService, useValue: mockBalanceService },
        { provide: UserLevelService, useValue: mockUserLevelService },
        { provide: SupportService, useValue: mockSupportService },
        { provide: FinancialOrchestratorService, useValue: mockOrchestratorService },
      ],
    }).compile();

    gateService = module.get<BotGateService>(BotGateService);
    commandService = module.get<BotCommandService>(BotCommandService);
    assistantService = module.get<BotAssistantService>(BotAssistantService);
    adminService = module.get<BotAdminService>(BotAdminService);
    paymentService = module.get<BotPaymentService>(BotPaymentService);
    withdrawalService = module.get<BotWithdrawalService>(BotWithdrawalService);
    monetizationService = module.get<BotMonetizationService>(BotMonetizationService);
    dispatcherService = module.get<BotDispatcherService>(BotDispatcherService);
  });

  describe('Channel Membership Gate & Multi-Channel Logging', () => {
    it('should verify member status and record audit event', async () => {
      const res = await gateService.verifyChannelMembership(BigInt(123456));
      expect(res.isMember).toBe(true);
      expect(mockPrismaService.channelVerificationEvent.create).toHaveBeenCalled();
    });

    it('should display onboarding step checklist on start', async () => {
      const res = await commandService.handleStart({ id: BigInt(123456), firstName: 'TestUser' });
      expect(res.text).toContain('Account Progress');
      expect(res.keyboard.keyboard).toBeDefined(); // Persistent keyboard attached
    });
  });

  describe('CryptoBot Payment Invoice Lifecycle', () => {
    it('should render deposit amount menu', async () => {
      const res = await paymentService.getDepositMenu(BigInt(123456));
      expect(res.text).toContain('Deposit Funds into TitanStream');
      expect(res.keyboard.inline_keyboard.length).toBeGreaterThan(0);
    });

    it('should create deposit invoice and return pay link', async () => {
      const res = await paymentService.createDepositInvoice({ telegramUserId: BigInt(123456), amount: 50 });
      expect(res.invoice).toBeDefined();
      expect(res.text).toContain('Deposit Invoice Created');
      expect(res.keyboard.inline_keyboard[0][0].url).toContain('CryptoBot');
    });

    it('should credit user balance on invoice paid', async () => {
      const res = await paymentService.processInvoicePaid('INV-123456789');
      expect(res.text).toContain('Payment Verified & Credited');
      expect(mockPrismaService.paymentInvoice.update).toHaveBeenCalled();
    });
  });

  describe('Interactive Withdrawal Assistant & Limit Controls', () => {
    it('should render withdrawal menu with tier limits', async () => {
      const res = await withdrawalService.getWithdrawalMenu(BigInt(123456));
      expect(res.text).toContain('TitanStream Withdrawal Assistant');
      expect(res.keyboard.inline_keyboard[0][0].text).toContain('Request Withdrawal');
    });

    it('should submit withdrawal request and trigger notification', async () => {
      const res = await withdrawalService.processWithdrawalRequest({
        telegramUserId: BigInt(123456),
        amount: 50,
        network: 'TRC20',
        destinationAddress: 'TY1234567890',
      });
      expect(res.text).toContain('Withdrawal Request Submitted');
      expect(mockWithdrawalService.initiateWithdrawal).toHaveBeenCalled();
    });
  });

  describe('Admin Controls & System Emergency Switches', () => {
    it('should render emergency controls menu', async () => {
      const res = await adminService.getEmergencyMenu();
      expect(res.text).toContain('Emergency Operational Controls');
      expect(res.keyboard.inline_keyboard.length).toBeGreaterThan(0);
    });

    it('should toggle emergency deposit pause', async () => {
      const res = await adminService.toggleEmergencyPause('depositsPaused', 'operator1');
      expect(mockPrismaService.emergencyControlState.update).toHaveBeenCalled();
      expect(res.text).toContain('Emergency Operational Controls');
    });
  });

  describe('Monetization Boost Product Checkout', () => {
    it('should render commercial products menu', async () => {
      const res = await monetizationService.getProductsMenu(BigInt(123456));
      expect(res.text).toContain('Commercial Boost Passes');
      expect(res.keyboard.inline_keyboard.length).toBe(5);
    });

    it('should generate invoice for product purchase', async () => {
      const res = await monetizationService.buyProduct(BigInt(123456), 'PRIORITY_SETTLEMENT');
      expect(res.text).toContain('Priority Settlement Pass');
      expect(mockPrismaService.productSubscription.create).toHaveBeenCalled();
    });
  });

  describe('Bot Dispatcher Text Button Integration', () => {
    it('should route persistent button text "💰 Balance" correctly', async () => {
      await dispatcherService.handleUpdate({
        update_id: 1,
        message: {
          message_id: 10,
          from: { id: 123456, is_bot: false, first_name: 'TestUser' },
          chat: { id: 123456, type: 'private' },
          text: '💰 Balance',
          date: Date.now(),
        },
      });

      expect(mockTelegramClient.sendMessage).toHaveBeenCalledWith(
        123456,
        expect.stringContaining('Your TitanStream Account Balance'),
        expect.anything(),
      );
    });
  });
});
