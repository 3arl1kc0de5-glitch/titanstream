import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { OperatorAmountActionDto, OperatorNoteDto } from './dto/operator-action.dto';
import { OperatorId } from './operator-auth.decorator';
import { SettlementService } from './settlement.service';

@Controller('api/v1/operator-portal/settlements')
export class OperationsPortalController {
  constructor(private readonly settlements: SettlementService) {}

  @Get()
  list(@OperatorId() operatorId: string) {
    return this.settlements.listOperatorSettlements(operatorId);
  }

  @Post(':settlementId/accept')
  accept(@OperatorId() operatorId: string, @Param('settlementId') settlementId: string) {
    return this.settlements.accept(operatorId, settlementId);
  }

  @Post(':settlementId/reject')
  reject(@OperatorId() operatorId: string, @Param('settlementId') settlementId: string, @Body() body: Partial<OperatorNoteDto>) {
    return this.settlements.reject(operatorId, settlementId, body.note);
  }

  @Post(':settlementId/payment-received')
  paymentReceived(@OperatorId() operatorId: string, @Param('settlementId') settlementId: string, @Body() dto: OperatorAmountActionDto) {
    return this.settlements.confirmPaymentReceived(operatorId, settlementId, dto.amount);
  }

  @Post(':settlementId/usdt-sent')
  usdtSent(@OperatorId() operatorId: string, @Param('settlementId') settlementId: string, @Body() dto: OperatorAmountActionDto) {
    return this.settlements.confirmUsdtSent(operatorId, settlementId, dto.amount);
  }

  @Post(':settlementId/notes')
  addNote(@OperatorId() operatorId: string, @Param('settlementId') settlementId: string, @Body() dto: OperatorNoteDto) {
    return this.settlements.addOperatorNote(operatorId, settlementId, dto.note);
  }
}
