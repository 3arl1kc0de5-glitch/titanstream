import { Prisma, SettlementProviderId, SettlementStatus, PaymentInvoiceStatus } from '@prisma/client';
import { CryptoBotProvider } from './cryptobot.provider';
import { CryptoBotSignatureService } from './cryptobot/cryptobot.signature.service';

describe('CryptoBot Integration Tests (Stage 11.0.1)', () => {
  const prisma = {
    settlementSession: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    paymentInvoice: {
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'inv_db_1', ...args.data })),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const events = { emit: jest.fn().mockResolvedValue({}) };
  const orchestrator = { requestOperation: jest.fn().mockResolvedValue({ id: 'op_1' }) };
  const cryptoBotClient = {
    createInvoice: jest.fn().mockResolvedValue({
      invoice_id: 889911,
      pay_url: 'https://t.me/CryptoBot?start=IV889911',
      mini_app_invoice_url: 'https://t.me/CryptoBot/app?startapp=invoice-889911',
      bot_invoice_url: 'https://t.me/CryptoBot?start=IV889911',
      status: 'active',
    }),
    getApiToken: jest.fn().mockReturnValue('test_token_123'),
  };

  const provider = new CryptoBotProvider(
    prisma as any,
    events as any,
    orchestrator as any,
    cryptoBotClient as any,
  );

  const session = {
    id: 'set_1',
    telegramUserId: 123n,
    provider: SettlementProviderId.CRYPTOBOT,
    asset: 'USDT',
    requestedAmount: new Prisma.Decimal('10'),
    expectedCryptoAmount: new Prisma.Decimal('10'),
    exchangeRate: new Prisma.Decimal('1'),
    referenceCode: 'CB-889911',
    status: SettlementStatus.WAITING_FOR_PAYMENT,
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('generates real CryptoBot invoice, persists PaymentInvoice, and returns payUrl', async () => {
    prisma.settlementSession.create.mockResolvedValue(session);

    const result = await provider.createSettlement(123n, {
      provider: SettlementProviderId.CRYPTOBOT,
      asset: 'USDT',
      requestedAmount: '10',
      expectedCryptoAmount: '10',
      exchangeRate: '1.0',
      country: 'GLOBAL',
      mobileMoneyNetwork: 'CRYPTOBOT',
    });

    expect(cryptoBotClient.createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        asset: 'USDT',
        amount: '10',
      }),
    );
    expect(prisma.paymentInvoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          externalInvoiceId: '889911',
          payUrl: 'https://t.me/CryptoBot?start=IV889911',
          status: PaymentInvoiceStatus.WAITING_FOR_PAYMENT,
        }),
      }),
    );
    expect(result.payUrl).toBe('https://t.me/CryptoBot?start=IV889911');
    expect(result.externalInvoiceId).toBe('889911');
  });

  it('approves through the financial orchestrator once for a valid CryptoBot settlement', async () => {
    prisma.settlementSession.findUnique.mockResolvedValue(session);
    prisma.settlementSession.update.mockResolvedValueOnce({ ...session, status: SettlementStatus.APPROVED });
    prisma.settlementSession.update.mockResolvedValueOnce({ ...session, status: SettlementStatus.COMPLETED });

    await expect(provider.approveSettlement('set_1', { callbackId: 'cb_1' })).resolves.toMatchObject({
      settlementId: 'set_1',
      status: SettlementStatus.COMPLETED,
    });
    expect(orchestrator.requestOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'settlement_set_1',
        reference: 'settlement_set_1',
        amount: '10',
      }),
    );
  });

  it('does not call the orchestrator for duplicate completed approvals', async () => {
    prisma.settlementSession.findUnique.mockResolvedValue({ ...session, status: SettlementStatus.COMPLETED });

    await provider.approveSettlement('set_1');
    expect(orchestrator.requestOperation).not.toHaveBeenCalled();
  });

  describe('HMAC Webhook Signature Verification', () => {
    const signatureService = new CryptoBotSignatureService();
    const token = '12345:AAFfakeTokenForUnitTesting';

    it('verifies valid HMAC-SHA256 signature', () => {
      const rawBody = JSON.stringify({ update_id: 1, update_type: 'invoice_paid' });
      // Calculate expected signature using CryptoBot formula
      const crypto = require('crypto');
      const secret = crypto.createHash('sha256').update(token).digest();
      const validSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      const isValid = signatureService.verifySignature(rawBody, validSig, token);
      expect(isValid).toBe(true);
    });

    it('rejects tampered or invalid signature', () => {
      const rawBody = JSON.stringify({ update_id: 1, update_type: 'invoice_paid' });
      const invalidSig = 'deadbeef1234567890abcdef';

      const isValid = signatureService.verifySignature(rawBody, invalidSig, token);
      expect(isValid).toBe(false);
    });
  });
});
