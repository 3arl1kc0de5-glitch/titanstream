import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MiningService } from './mining.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TelegramUserId } from '../../common/decorators/telegram-user-id.decorator';

@ApiTags('Mining Engine')
@Controller('mining')
@UseGuards(AuthGuard)
export class MiningController {
  constructor(private readonly service: MiningService) {}

  @Get('state')
  @ApiOperation({ summary: 'Get current user mining session state' })
  async getMiningState(@TelegramUserId() telegramUserId: bigint) {
    return this.service.getOrCreateSession(telegramUserId.toString());
  }

  @Post('tap')
  @ApiOperation({ summary: 'Tap the mining cooler to increase speed multiplier' })
  async tapCooler(@TelegramUserId() telegramUserId: bigint) {
    return this.service.tap(telegramUserId.toString());
  }

  @Post('toggle')
  @ApiOperation({ summary: 'Toggle active mining asset between USDT and TON' })
  async toggleCurrency(
    @TelegramUserId() telegramUserId: bigint,
    @Body('currency') currency: 'USDT' | 'TON',
  ) {
    return this.service.toggleCurrency(telegramUserId.toString(), currency);
  }

  @Post('claim')
  @ApiOperation({ summary: 'Claim and disburse accumulated mining yield to double-entry ledger' })
  async claimRewards(@TelegramUserId() telegramUserId: bigint) {
    return this.service.claim(telegramUserId.toString());
  }
}
