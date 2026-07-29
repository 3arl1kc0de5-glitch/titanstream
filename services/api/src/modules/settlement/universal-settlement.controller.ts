import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TelegramUserId } from '../../common/decorators/telegram-user-id.decorator';
import { CreateSettlementSessionDto } from './dto/create-settlement-session.dto';
import { ProviderRegistryService } from './provider-registry.service';

@Controller(['settlement', 'api/v1/settlement'])
@UseGuards(AuthGuard)
export class UniversalSettlementController {
  constructor(private readonly registry: ProviderRegistryService) {}

  @Get('providers')
  providers(@Query('asset') asset?: string, @Query('country') country?: string) {
    return this.registry.listProviders({ asset, country, buyOnly: true });
  }

  @Post('session')
  create(@TelegramUserId() telegramUserId: bigint, @Body() dto: CreateSettlementSessionDto) {
    return this.registry.routeCreate(telegramUserId, dto);
  }

  @Get(['session/:id', 'session/:settlementId'])
  get(@TelegramUserId() telegramUserId: bigint, @Param('id') id: string, @Param('settlementId') settlementId: string) {
    return this.registry.getSession(telegramUserId, id || settlementId);
  }

  @Post(['session/:id/cancel', 'session/:settlementId/cancel'])
  cancel(@Param('id') id: string, @Param('settlementId') settlementId: string) {
    return this.registry.cancel(id || settlementId);
  }

  @Get('history')
  history(@TelegramUserId() telegramUserId: bigint) {
    return this.registry.history(telegramUserId);
  }
}
