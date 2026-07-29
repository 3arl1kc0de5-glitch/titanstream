import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/user.interface';
import { CreateSettlementSessionDto } from './dto/create-settlement-session.dto';
import { SettlementService } from './settlement.service';

@Controller('api/v1/settlements')
export class SettlementController {
  constructor(private readonly settlements: SettlementService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSettlementSessionDto) {
    return this.settlements.createCustomerSession(user.id, dto);
  }

  @Get(':settlementId')
  get(@CurrentUser() user: AuthenticatedUser, @Param('settlementId') settlementId: string) {
    return this.settlements.getCustomerSession(user.id, settlementId);
  }
}
