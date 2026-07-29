import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MachineService } from './machine.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TelegramUserId } from '../../common/decorators/telegram-user-id.decorator';

@ApiTags('Machines')
@Controller('machines')
export class MachineController {
  constructor(private readonly service: MachineService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Get available Cloud Machine capacity catalog' })
  getCatalog() {
    return {
      success: true,
      data: this.service.getCatalog(),
    };
  }

  @Get('my')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get active user cloud machines and capacity telemetry' })
  getMyMachines(@TelegramUserId() telegramUserId: bigint) {
    return {
      success: true,
      data: this.service.getUserMachines(telegramUserId.toString()),
    };
  }

  @Post('purchase')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Purchase and activate a Cloud Machine using wallet balance or initiating deposit' })
  async purchaseMachine(
    @TelegramUserId() telegramUserId: bigint,
    @Body('tierCode') tierCode: string,
  ) {
    const result = await this.service.purchaseMachine(telegramUserId, tierCode);
    return {
      success: true,
      data: result,
    };
  }
}
