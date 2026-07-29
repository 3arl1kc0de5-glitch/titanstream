import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TelegramUserId } from '../../common/decorators/telegram-user-id.decorator';
import { BalanceService } from './balance.service';
import { FinancialAccountService } from './financial-account.service';
import { LedgerService } from './ledger.service';
import { PaginationDto } from './dto/pagination.dto';
import { TransactionService } from './transaction.service';

@ApiTags('Financial')
@Controller('financial')
@UseGuards(AuthGuard)
export class FinancialController {
  constructor(
    private readonly accounts: FinancialAccountService,
    private readonly balances: BalanceService,
    private readonly ledger: LedgerService,
    private readonly transactions: TransactionService,
  ) {}

  @Get('account')
  @ApiOperation({ summary: 'Get or create current user financial account' })
  async getAccount(@TelegramUserId() telegramUserId: bigint) {
    return this.accounts.getOrCreateForReadyUser(telegramUserId);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get derived balances for current user' })
  async getBalance(@TelegramUserId() telegramUserId: bigint) {
    const account = await this.accounts.getOrCreateForReadyUser(telegramUserId);
    return this.balances.getBalances(telegramUserId, account.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get current user transactions' })
  async getTransactions(@TelegramUserId() telegramUserId: bigint, @Query() query: PaginationDto) {
    const account = await this.accounts.getOrCreateForReadyUser(telegramUserId);
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const items = await this.transactions.findForAccount(account.id, limit, offset);
    return { items, pagination: { limit, offset } };
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Get current user ledger entries' })
  async getLedger(@TelegramUserId() telegramUserId: bigint, @Query() query: PaginationDto) {
    const account = await this.accounts.getOrCreateForReadyUser(telegramUserId);
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    const items = await this.ledger.findForAccount(account.id, limit, offset);
    return { items, pagination: { limit, offset } };
  }
}
