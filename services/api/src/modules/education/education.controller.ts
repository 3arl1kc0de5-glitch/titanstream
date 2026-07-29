import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EducationService } from './education.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { TelegramUserId } from '../../common/decorators/telegram-user-id.decorator';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { CompleteModuleDto } from './dto/complete-module.dto';
import { UpdateProgressDto } from './dto/update-progress.dto';

@ApiTags('Education')
@Controller('education')
@UseGuards(AuthGuard)
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  @Get('modules')
  @ApiOperation({ summary: 'Get all education modules with user progress' })
  async getModules(@TelegramUserId() telegramUserId: bigint) {
    return this.educationService.getModules(telegramUserId);
  }

  @Post('modules/:moduleId/start')
  @ApiOperation({ summary: 'Start an education module' })
  async startModule(
    @TelegramUserId() telegramUserId: bigint,
    @Param('moduleId') moduleId: string,
  ) {
    return this.educationService.startModule(telegramUserId, moduleId);
  }

  @Post('modules/:moduleId/progress')
  @ApiOperation({ summary: 'Update module progress (slide index, time)' })
  async updateProgress(
    @TelegramUserId() telegramUserId: bigint,
    @Param('moduleId') moduleId: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.educationService.updateProgress(telegramUserId, moduleId, dto.currentSlideIndex, dto.timeSpentSeconds);
  }

  @Post('modules/:moduleId/answer')
  @ApiOperation({ summary: 'Submit a quiz answer' })
  async submitAnswer(
    @TelegramUserId() telegramUserId: bigint,
    @Param('moduleId') moduleId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.educationService.submitQuizAnswer(telegramUserId, moduleId, dto.questionIndex, dto.selectedIndex);
  }

  @Post('modules/:moduleId/complete')
  @ApiOperation({ summary: 'Complete an education module' })
  async completeModule(
    @TelegramUserId() telegramUserId: bigint,
    @Param('moduleId') moduleId: string,
    @Body() _dto: CompleteModuleDto,
  ) {
    return this.educationService.completeModule(telegramUserId, moduleId);
  }

  @Get('modules/:moduleId/content')
  @ApiOperation({ summary: 'Get raw module content' })
  async getModuleContent(@Param('moduleId') moduleId: string) {
    return this.educationService.getModuleContent(moduleId);
  }
}