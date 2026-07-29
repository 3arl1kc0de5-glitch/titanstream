import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReadinessService } from './readiness.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TelegramUserId } from '../../common/decorators/telegram-user-id.decorator';

@ApiTags('Readiness')
@Controller('readiness')
@UseGuards(AuthGuard)
export class ReadinessController {
  constructor(private readonly readinessService: ReadinessService) {}

  @Get(['', 'status'])
  @ApiOperation({ summary: 'Get current readiness score and status' })
  async getReadiness(@TelegramUserId() telegramUserId: bigint) {
    return this.readinessService.getReadiness(telegramUserId);
  }

  @Post('calculate')
  @ApiOperation({ summary: 'Force recalculation of readiness score' })
  async calculateReadiness(@TelegramUserId() telegramUserId: bigint) {
    return this.readinessService.calculateReadiness(telegramUserId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get readiness score history' })
  async getHistory(@TelegramUserId() telegramUserId: bigint) {
    return this.readinessService.getReadinessHistory(telegramUserId);
  }
}
