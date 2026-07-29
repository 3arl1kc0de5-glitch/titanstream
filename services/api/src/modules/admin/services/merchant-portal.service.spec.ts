import { SettlementStatus } from '@prisma/client';
import { MerchantPortalService } from './merchant-portal.service';

describe('MerchantPortalService', () => {
  const prisma = {
    settlementSession: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    settlementEvent: { create: jest.fn() },
    merchantProfile: { findUnique: jest.fn() },
  };
  const audit = { logAction: jest.fn() };

  let service: MerchantPortalService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MerchantPortalService(prisma as any, audit as any);
  });

  it('fulfills assigned settlement and transitions status to VERIFYING', async () => {
    prisma.settlementSession.findUnique.mockResolvedValue({
      id: 'sess_1',
      operatorId: 'merch_1',
      status: SettlementStatus.WAITING_PAYMENT,
      providerMetadata: {},
    });

    prisma.settlementSession.update.mockResolvedValue({
      id: 'sess_1',
      status: SettlementStatus.VERIFYING,
    });

    const res = await service.fulfillSettlement('merch_1', 'sess_1', 'MPESA_REF_9988');

    expect(res.status).toBe('FULFILLED');
    expect(res.currentStatus).toBe(SettlementStatus.VERIFYING);
    expect(prisma.settlementEvent.create).toHaveBeenCalled();
    expect(audit.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'MERCHANT_FULFILLED_SETTLEMENT' }),
    );
  });
});
