import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TelegramClientService } from './telegram-client.service';
import { BotPaymentService } from './bot-payment.service';

export interface CommercialProduct {
  code: string;
  name: string;
  priceUSDT: number;
  description: string;
  benefits: string[];
}

@Injectable()
export class BotMonetizationService {
  private readonly logger = new Logger(BotMonetizationService.name);
  private readonly webAppUrl = process.env.TELEGRAM_WEBAPP_URL || 'https://titanstream.app';

  private readonly products: Record<string, CommercialProduct> = {
    PRIORITY_SETTLEMENT: {
      code: 'PRIORITY_SETTLEMENT',
      name: '🚀 Priority Settlement Pass',
      priceUSDT: 15,
      description: 'Get sub-minute priority queue routing for all deposit & withdrawal settlements.',
      benefits: [
        '⚡ Instant express settlement queue',
        '📊 Dedicated operator assignment',
        '🛡 Zero queue waiting time',
      ],
    },
    HIGHER_LIMITS: {
      code: 'HIGHER_LIMITS',
      name: '⭐ High-Volume Limits Pass',
      priceUSDT: 29,
      description: 'Unlock $10,000+ daily transaction limits instantly without waiting for account aging.',
      benefits: [
        '📈 $10,000+ Daily Limit',
        '🔑 Instant Tier 4 Access',
        '💼 Unlimited Single Operations',
      ],
    },
    BUSINESS_ACCOUNT: {
      code: 'BUSINESS_ACCOUNT',
      name: '🏢 Business Merchant Account',
      priceUSDT: 99,
      description: 'Enterprise tools for automated payouts, merchant portal reports, and API access.',
      benefits: [
        '🔌 Full REST & Webhook API access',
        '📑 Automated daily accounting exports',
        '👨‍💼 Dedicated 24/7 account manager',
      ],
    },
    REFERRAL_BOOST: {
      code: 'REFERRAL_BOOST',
      name: '⚡ 2x Referral Reward Multiplier',
      priceUSDT: 19,
      description: 'Double your referral payouts on every new user invited.',
      benefits: [
        '🎁 2x USDT on every qualified referral',
        '🔥 Custom vanity referral code',
        '📈 Campaign analytics dashboard',
      ],
    },
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramClient: TelegramClientService,
    private readonly botPayment: BotPaymentService,
  ) {}

  async getProductsMenu(telegramUserId: bigint): Promise<{ text: string; keyboard: any }> {
    const activeSubs = await this.prisma.productSubscription.findMany({
      where: { telegramUserId, status: 'ACTIVE' },
    });

    const activeCodes = new Set(activeSubs.map((s) => s.productCode));

    const text = `<b>🚀 TitanStream Commercial Boost Passes</b>\n\nSupercharge your financial experience with premium passes and business features:\n\n` +
      `• <b>🚀 Priority Settlement Pass</b> ($15/mo)\n` +
      `• <b>⭐ High-Volume Limits Pass</b> ($29/mo)\n` +
      `• <b>🏢 Business Merchant Account</b> ($99/mo)\n` +
      `• <b>⚡ 2x Referral Reward Multiplier</b> ($19/mo)\n\n` +
      `Active Subscriptions: <b>${activeSubs.length > 0 ? activeSubs.map((s) => s.productCode).join(', ') : 'None'}</b>`;

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [{ text: `${activeCodes.has('PRIORITY_SETTLEMENT') ? '✅' : '🚀'} Priority Pass ($15)`, callback_data: 'prod_view_PRIORITY_SETTLEMENT' }],
          [{ text: `${activeCodes.has('HIGHER_LIMITS') ? '✅' : '⭐'} High-Volume Limits ($29)`, callback_data: 'prod_view_HIGHER_LIMITS' }],
          [{ text: `${activeCodes.has('REFERRAL_BOOST') ? '✅' : '⚡'} 2x Referral Boost ($19)`, callback_data: 'prod_view_REFERRAL_BOOST' }],
          [{ text: `${activeCodes.has('BUSINESS_ACCOUNT') ? '✅' : '🏢'} Business Account ($99)`, callback_data: 'prod_view_BUSINESS_ACCOUNT' }],
          [{ text: '🌐 Open Growth & Boost Hub', web_app: { url: `${this.webAppUrl}/boost` } }],
        ],
      },
    };
  }

  async getProductDetails(productCode: string): Promise<{ text: string; keyboard: any }> {
    const product = this.products[productCode];
    if (!product) return this.getProductsMenu(BigInt(0));

    const benefitsList = product.benefits.map((b) => `• ${b}`).join('\n');
    const text = `<b>${product.name}</b>\n\n${product.description}\n\n<b>Key Benefits:</b>\n${benefitsList}\n\n<b>Price:</b> <b>${product.priceUSDT} USDT / month</b>`;

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [{ text: `💳 Purchase Pass (${product.priceUSDT} USDT)`, callback_data: `prod_buy_${productCode}` }],
          [{ text: '⬅️ Back to Products Menu', callback_data: 'cmd_upgrade' }],
        ],
      },
    };
  }

  async buyProduct(telegramUserId: bigint, productCode: string): Promise<{ text: string; keyboard: any }> {
    const product = this.products[productCode];
    if (!product) throw new Error('Product not found');

    const result = await this.botPayment.createDepositInvoice({
      telegramUserId,
      amount: product.priceUSDT,
      currency: 'USD',
      asset: 'USDT',
    });

    // Auto-create active subscription upon payment confirmation
    await this.prisma.productSubscription.create({
      data: {
        telegramUserId,
        productCode,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        metadata: { invoiceId: result.invoice.id },
      },
    });

    return {
      text: `<b>🛍 Checkout: ${product.name}</b>\n\n<b>Price:</b> ${product.priceUSDT} USDT\n<b>Invoice ID:</b> <code>${result.invoice.externalInvoiceId}</code>\n\nClick below to complete your payment:`,
      keyboard: result.keyboard,
    };
  }
}
