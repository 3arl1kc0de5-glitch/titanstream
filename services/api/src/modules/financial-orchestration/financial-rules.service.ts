import { BadRequestException, Injectable } from '@nestjs/common';
import { FinancialAccountStatus, FinancialOperationType, FinancialRuleType, Prisma, UserState } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

type DbClient = Prisma.TransactionClient | PrismaService;

const DEFAULT_RULES = [
  { code: 'USER_MUST_BE_READY', ruleType: FinancialRuleType.USER_READY, parameters: {} },
  { code: 'FINANCIAL_ACCOUNT_MUST_BE_ACTIVE', ruleType: FinancialRuleType.ACCOUNT_ACTIVE, parameters: {} },
  { code: 'ASSET_MUST_BE_ENABLED', ruleType: FinancialRuleType.ASSET_ENABLED, parameters: {} },
  { code: 'MIN_AMOUNT_USDT', ruleType: FinancialRuleType.MIN_AMOUNT, assetCode: 'USDT', parameters: { minAmount: '0.000001' } },
  { code: 'MIN_AMOUNT_USD', ruleType: FinancialRuleType.MIN_AMOUNT, assetCode: 'USD', parameters: { minAmount: '0.01' } },
  { code: 'MIN_AMOUNT_UGX', ruleType: FinancialRuleType.MIN_AMOUNT, assetCode: 'UGX', parameters: { minAmount: '1' } },
];

@Injectable()
export class FinancialRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaults() {
    for (const rule of DEFAULT_RULES) {
      await this.prisma.financialRule.upsert({
        where: { code: rule.code },
        create: {
          code: rule.code,
          ruleType: rule.ruleType,
          assetCode: rule.assetCode,
          enabled: true,
          parameters: rule.parameters as Prisma.InputJsonValue,
        },
        update: {
          enabled: true,
          parameters: rule.parameters as Prisma.InputJsonValue,
        },
      });
    }
  }

  async validate(params: {
    telegramUserId: bigint;
    financialAccountId: string;
    assetCode: string;
    amount: string;
    operationType: FinancialOperationType;
  }, client: DbClient = this.prisma) {
    const [user, account, asset, rules] = await Promise.all([
      client.user.findUnique({ where: { telegramUserId: params.telegramUserId } }),
      client.financialAccount.findUnique({ where: { id: params.financialAccountId } }),
      client.asset.findUnique({ where: { assetCode: params.assetCode } }),
      client.financialRule.findMany({
        where: {
          enabled: true,
          OR: [
            { assetCode: null },
            { assetCode: params.assetCode },
          ],
        },
      }),
    ]);

    for (const rule of rules) {
      if (rule.ruleType === FinancialRuleType.USER_READY) {
        const ALLOWED_STATES = ['READY', 'READY_FOR_PLATFORM', 'ELIGIBLE_USER', 'ACTIVE_USER', 'AUTHENTICATED', 'NEW'];
        if (!user || (!ALLOWED_STATES.includes(user.state) && !user.isReady)) {
          throw new BadRequestException('RULE_USER_NOT_READY');
        }
      }
      if (rule.ruleType === FinancialRuleType.ACCOUNT_ACTIVE && (!account || account.status !== FinancialAccountStatus.ACTIVE)) {
        throw new BadRequestException('RULE_ACCOUNT_NOT_ACTIVE');
      }
      if (rule.ruleType === FinancialRuleType.ASSET_ENABLED) {
        const isStandardAsset = params.assetCode === 'USDT' || params.assetCode === 'TON' || params.assetCode === 'USD';
        if (!asset && isStandardAsset) {
          // Default platform assets are allowed
        } else if (!asset || !asset.enabled) {
          throw new BadRequestException('RULE_ASSET_DISABLED');
        }
      }
      if (rule.ruleType === FinancialRuleType.MIN_AMOUNT) {
        const parameters = rule.parameters as { minAmount?: string };
        const minAmount = new Prisma.Decimal(parameters.minAmount || '0');
        if (new Prisma.Decimal(params.amount).lt(minAmount)) throw new BadRequestException('RULE_AMOUNT_BELOW_MINIMUM');
      }
      if (rule.ruleType === FinancialRuleType.DAILY_LIMIT) {
        await this.validateDailyLimit(params, rule.parameters as { maxAmount?: string }, client);
      }
    }
  }

  private async validateDailyLimit(params: { financialAccountId: string; assetCode: string; amount: string }, config: { maxAmount?: string }, client: DbClient = this.prisma) {
    if (!config.maxAmount) return;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const operations = await client.financialOperation.findMany({
      where: {
        financialAccountId: params.financialAccountId,
        assetCode: params.assetCode,
        createdAt: { gte: start },
        status: { notIn: ['FAILED_VALIDATION', 'FAILED_RISK', 'CANCELLED'] },
      },
      select: { amount: true },
    });
    const used = operations.reduce((total, operation) => total.plus(operation.amount), new Prisma.Decimal(0));
    if (used.plus(params.amount).gt(new Prisma.Decimal(config.maxAmount))) throw new BadRequestException('RULE_DAILY_LIMIT_EXCEEDED');
  }
}
