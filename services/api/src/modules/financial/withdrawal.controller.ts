import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TelegramUserId } from '../../common/decorators/telegram-user-id.decorator';
import { InitiateWithdrawalDto, WithdrawalService } from './withdrawal.service';

@Controller('financial/withdrawals')
@UseGuards(AuthGuard)
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  @Post()
  async initiateWithdrawal(
    @TelegramUserId() telegramUserId: bigint,
    @Body() body: { amount: number; asset?: string; network: string; destinationAddress: string; country?: string; mobileMoneyNetwork?: string },
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    const dto: InitiateWithdrawalDto = {
      telegramUserId,
      amount: body.amount,
      asset: body.asset || 'USDT',
      network: body.network,
      destinationAddress: body.destinationAddress,
      country: body.country,
      mobileMoneyNetwork: body.mobileMoneyNetwork,
    };
    return this.withdrawalService.initiateWithdrawal(dto, idempotencyKey);
  }

  @Get()
  async getWithdrawalHistory(
    @TelegramUserId() telegramUserId: bigint,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.withdrawalService.getUserWithdrawalHistory(telegramUserId, limit, offset);
  }
}
