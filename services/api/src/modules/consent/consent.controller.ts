import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConsentService } from './consent.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TelegramUserId } from '../../common/decorators/telegram-user-id.decorator';
import { RecordConsentDto } from './dto/record-consent.dto';
import { ConsentType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

@ApiTags('Consent')
@Controller('consent')
@UseGuards(AuthGuard)
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Get('required')
  @ApiOperation({ summary: 'Get list of required consents' })
  async getRequiredConsents() {
    return this.consentService.getRequiredConsents();
  }

  @Get('status')
  @ApiOperation({ summary: 'Get consent status for current user' })
  async getConsentStatus(@TelegramUserId() telegramUserId: bigint) {
    return this.consentService.getConsentStatus(telegramUserId);
  }

  @Post(':type')
  @ApiOperation({ summary: 'Record a consent' })
  async recordConsent(
    @TelegramUserId() telegramUserId: bigint,
    @Param('type') type: ConsentType,
    @Body() dto: RecordConsentDto,
  ) {
    return this.consentService.recordConsent(telegramUserId, type, dto);
  }

  @Post(':type/revoke')
  @ApiOperation({ summary: 'Revoke a previous consent' })
  async revokeConsent(
    @TelegramUserId() telegramUserId: bigint,
    @Param('type') type: ConsentType,
  ) {
    return this.consentService.revokeConsent(telegramUserId, type);
  }
}