import { Controller, Get, Post, UseGuards, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TelegramUserId } from '../../common/decorators/telegram-user-id.decorator';

@ApiTags('Onboarding')
@Controller('onboarding')
@UseGuards(AuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('state')
  @ApiOperation({ summary: 'Get current onboarding state' })
  async getState(@TelegramUserId() telegramUserId: bigint) {
    return this.onboardingService.getState(telegramUserId);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current onboarding status' })
  async getStatus(@TelegramUserId() telegramUserId: bigint) {
    return this.onboardingService.getState(telegramUserId);
  }

  @Post('start')
  @ApiOperation({ summary: 'Start the onboarding process' })
  async startOnboarding(@TelegramUserId() telegramUserId: bigint) {
    return this.onboardingService.startOnboarding(telegramUserId);
  }

  @Post('step')
  @ApiOperation({ summary: 'Complete an onboarding step' })
  async completeStep(
    @TelegramUserId() telegramUserId: bigint,
    @Body('step') step: string,
  ) {
    return this.onboardingService.completeStep(telegramUserId, step);
  }

  @Post('transition')
  @ApiOperation({ summary: 'Transition onboarding lifecycle state' })
  async transition(
    @TelegramUserId() telegramUserId: bigint,
    @Body('state') state: string,
    @Body('trigger') trigger?: string,
    @Body('metadata') metadata?: any,
  ) {
    return this.onboardingService.transition(telegramUserId, state as any, trigger, metadata);
  }

  @Post('resume')
  @ApiOperation({ summary: 'Resume stalled onboarding' })
  async resumeOnboarding(@TelegramUserId() telegramUserId: bigint) {
    return this.onboardingService.resumeOnboarding(telegramUserId);
  }

  @Get('progress')
  @ApiOperation({ summary: 'Get detailed onboarding progress' })
  async getProgress(@TelegramUserId() telegramUserId: bigint) {
    return this.onboardingService.getProgress(telegramUserId);
  }
}
