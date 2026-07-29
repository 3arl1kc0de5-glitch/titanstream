import { MerchantStatus, Prisma } from '@prisma/client';
import { MerchantPerformanceService } from './merchant-performance.service';

describe('MerchantPerformanceService', () => {
  const prisma = {
    merchantProfile: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    operator: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    settlementSession: {
      findMany: jest.fn(),
    },
  };
  const audit = { logAction: jest.fn() };

  let service: MerchantPerformanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MerchantPerformanceService(prisma as any, audit as any);
  });

  it('creates merchant and syncs operator record with PENDING status', async () => {
    prisma.merchantProfile.create.mockResolvedValue({
      id: 'merch_1',
      displayName: 'Test Merchant',
      country: 'KE',
      phone: '+254712345678',
      whatsappContact: '+254712345678',
      supportedNetworks: ['MPESA'],
      supportedAssets: ['USDT'],
      dailyLimit: new Prisma.Decimal(5000),
      status: MerchantStatus.PENDING,
    });

    const dto = {
      displayName: 'Test Merchant',
      country: 'KE',
      phone: '+254712345678',
      whatsappContact: '+254712345678',
      supportedNetworks: ['MPESA'],
      supportedAssets: ['USDT'],
    };

    const res = await service.createMerchant({ id: 'admin_1', role: 'SUPER_ADMIN' }, dto);
    expect(res.id).toBe('merch_1');
    expect(prisma.operator.create).toHaveBeenCalled();
    expect(audit.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'MERCHANT_CREATED' }),
    );
  });

  it('updates merchant status and emits audit log', async () => {
    prisma.merchantProfile.findUnique.mockResolvedValue({ id: 'merch_1', status: MerchantStatus.PENDING });
    prisma.merchantProfile.update.mockResolvedValue({ id: 'merch_1', status: MerchantStatus.ACTIVE });

    const res = await service.updateMerchantStatus(
      { id: 'admin_1', role: 'SUPER_ADMIN' },
      'merch_1',
      MerchantStatus.ACTIVE,
      'Approved after verification',
    );

    expect(res.currentStatus).toBe(MerchantStatus.ACTIVE);
    expect(audit.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'MERCHANT_STATUS_ACTIVE' }),
    );
  });

  it('calculates trust score and metrics accurately', async () => {
    prisma.merchantProfile.findUnique.mockResolvedValue({
      id: 'merch_1',
      displayName: 'Test Merchant',
      averageCompletionTimeSeconds: 180,
    });
    prisma.merchantProfile.update.mockResolvedValue({});

    prisma.settlementSession.findMany.mockResolvedValue([
      { status: 'COMPLETED' },
      { status: 'COMPLETED' },
      { status: 'REJECTED' }, // -2%
      { status: 'DISPUTED' }, // -5%
    ]);

    const res = await service.calculateMerchantPerformance('merch_1');

    expect(res.metrics.completed_settlements).toBe(2);
    expect(res.metrics.rejected_settlements).toBe(1);
    expect(res.metrics.disputed_settlements).toBe(1);
    expect(res.metrics.trust_score).toBe('93.0%'); // 100 - 2 - 5 = 93
  });
});
