import { SettlementStatus } from '@prisma/client';
import { SettlementObservabilityService } from './settlement-observability.service';

describe('SettlementObservabilityService', () => {
  const prisma = {
    settlementSession: {
      findMany: jest.fn(),
    },
    merchantProfile: {
      findMany: jest.fn(),
    },
  };

  let service: SettlementObservabilityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SettlementObservabilityService(prisma as any);
  });

  it('calculates SLA durations and identifies phase breaches correctly', async () => {
    const baseTime = new Date('2026-07-28T10:00:00Z');
    const assignedTime = new Date('2026-07-28T10:00:30Z'); // 30s waiting
    const paymentRecTime = new Date('2026-07-28T10:02:30Z'); // 120s merchant response
    const usdtSentTime = new Date('2026-07-28T10:03:00Z'); // 30s payment confirm
    const completedTime = new Date('2026-07-28T10:03:30Z'); // 30s crypto delivery

    prisma.settlementSession.findMany.mockResolvedValue([
      {
        id: 's_1',
        status: SettlementStatus.COMPLETED,
        createdAt: baseTime,
        merchantAssignedAt: assignedTime,
        paymentReceivedAt: paymentRecTime,
        usdtSentAt: usdtSentTime,
        completedAt: completedTime,
      },
    ]);

    const res = await service.calculateSlaMetrics(7);

    expect(res.total_completed_sessions).toBe(1);
    expect(res.average_durations_seconds.time_waiting).toBe(30);
    expect(res.average_durations_seconds.merchant_response_time).toBe(120);
    expect(res.average_durations_seconds.payment_confirmation_time).toBe(30);
    expect(res.average_durations_seconds.crypto_delivery_time).toBe(30);
    expect(res.average_durations_seconds.total_fulfillment_time).toBe(210);
    expect(res.sla_compliance_rate).toBe('100.0%');
  });
});
