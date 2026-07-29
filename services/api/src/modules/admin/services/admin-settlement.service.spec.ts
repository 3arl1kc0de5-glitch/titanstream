import { SettlementStatus } from '@prisma/client';
import { AdminSettlementService } from './admin-settlement.service';

describe('AdminSettlementService', () => {
  const prisma = {
    settlementSession: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    settlementNote: { create: jest.fn() },
    riskEvent: { create: jest.fn() },
    operator: { findUnique: jest.fn() },
    operationalAuditLog: { findMany: jest.fn() },
  };
  const audit = { logAction: jest.fn() };

  let service: AdminSettlementService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminSettlementService(prisma as any, audit as any);
  });

  it('reviews settlement, adds internal note, and logs audit event', async () => {
    prisma.settlementSession.findUnique.mockResolvedValue({ id: 's_1', status: SettlementStatus.WAITING_PAYMENT });
    prisma.settlementSession.update.mockResolvedValue({ id: 's_1', status: SettlementStatus.VERIFYING });

    const res = await service.reviewSettlement(
      { id: 'admin_1', role: 'OPERATIONS_ADMIN' },
      's_1',
      'Payment verified on bank portal',
      SettlementStatus.VERIFYING,
    );

    expect(res.currentStatus).toBe(SettlementStatus.VERIFYING);
    expect(prisma.settlementNote.create).toHaveBeenCalled();
    expect(audit.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SETTLEMENT_REVIEWED' }),
    );
  });

  it('escalates settlement, flags status, and creates risk event', async () => {
    prisma.settlementSession.findUnique.mockResolvedValue({ id: 's_1', status: SettlementStatus.WAITING_PAYMENT });
    prisma.riskEvent.create.mockResolvedValue({ id: 'risk_1' });

    const res = await service.escalateSettlement(
      { id: 'admin_1', role: 'OPERATIONS_ADMIN' },
      's_1',
      'Proof of payment appears tampered',
    );

    expect(res.status).toBe('ESCALATED');
    expect(res.riskEventId).toBe('risk_1');
    expect(prisma.settlementSession.update).toHaveBeenCalledWith({
      where: { id: 's_1' },
      data: { status: SettlementStatus.RISK_FLAGGED },
    });
    expect(audit.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SETTLEMENT_ESCALATED' }),
    );
  });
});
