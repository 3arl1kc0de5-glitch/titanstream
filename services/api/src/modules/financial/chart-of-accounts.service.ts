import { Injectable, NotFoundException } from '@nestjs/common';
import { LedgerAccountType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const REQUIRED_LEDGER_ACCOUNTS = [
  { code: 'PLATFORM_RESERVE', name: 'Platform Reserve', type: LedgerAccountType.ASSET },
  { code: 'USER_ASSET_LIABILITY', name: 'User Asset Liability', type: LedgerAccountType.LIABILITY },
  { code: 'FEES', name: 'Fees', type: LedgerAccountType.REVENUE },
  { code: 'ADJUSTMENTS', name: 'Adjustments', type: LedgerAccountType.EXPENSE },
  { code: 'SUSPENSE', name: 'Suspense', type: LedgerAccountType.LIABILITY },
  { code: 'SYSTEM', name: 'System', type: LedgerAccountType.SYSTEM },
];

@Injectable()
export class ChartOfAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaults() {
    for (const account of REQUIRED_LEDGER_ACCOUNTS) {
      await this.prisma.ledgerAccount.upsert({
        where: { code: account.code },
        create: {
          ...account,
          description: `${account.name} ledger account`,
          enabled: true,
        },
        update: {
          name: account.name,
          type: account.type,
          enabled: true,
        },
      });
    }
  }

  async getRequired(code: string) {
    const account = await this.prisma.ledgerAccount.findUnique({ where: { code } });
    if (!account || !account.enabled) throw new NotFoundException(`LEDGER_ACCOUNT_NOT_FOUND:${code}`);
    return account;
  }
}
