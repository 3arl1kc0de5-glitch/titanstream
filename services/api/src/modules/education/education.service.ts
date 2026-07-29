import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditEventType, UserState } from '../../common/interfaces/user-state.enum';
import { AuditService } from '../audit/audit.service';
import { EducationModuleId } from '@prisma/client';

interface QuizAnswer {
  questionIndex: number;
  selectedIndex: number;
  correct: boolean;
}

@Injectable()
export class EducationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getModules(telegramUserId: bigint) {
    const modules = await this.prisma.educationModule.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
    });

    const completions = await this.prisma.educationCompletion.findMany({
      where: { telegramUserId },
    });

    const completionMap = new Map(completions.map((c) => [c.moduleId, c]));

    return modules.map((mod) => {
      const progress = completionMap.get(mod.id);
      return {
        id: mod.id,
        title: mod.title,
        description: mod.description,
        mandatory: mod.mandatory,
        estimatedSeconds: mod.estimatedSeconds,
        orderIndex: mod.orderIndex,
        completionType: mod.completionType,
        passThreshold: mod.passThreshold,
        version: mod.version,
        status: progress?.status || 'NOT_STARTED',
        score: progress?.score || null,
        passed: progress?.passed || null,
        attempts: progress?.attempts || 0,
        currentSlideIndex: progress?.currentSlideIndex || 0,
        startedAt: progress?.startedAt || null,
        completedAt: progress?.completedAt || null,
        content: this.filterContentByProgress(mod.content as any[], progress),
      };
    });
  }

  async startModule(telegramUserId: bigint, moduleId: string) {
    const module = await this.prisma.educationModule.findUnique({
      where: { id: moduleId as EducationModuleId },
    });
    if (!module) throw new NotFoundException('MODULE_NOT_FOUND');

    const completion = await this.prisma.educationCompletion.upsert({
      where: {
        telegramUserId_moduleId: {
          telegramUserId,
          moduleId: moduleId as EducationModuleId,
        },
      },
      create: {
        telegramUserId,
        moduleId: moduleId as EducationModuleId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        currentSlideIndex: 0,
        moduleVersion: module.version,
      },
      update: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        moduleVersion: module.version,
      },
    });

    await this.prisma.onboardingProgress.updateMany({
      where: { telegramUserId },
      data: { currentModuleId: moduleId },
    });

    await this.auditService.create({
      telegramUserId,
      eventType: AuditEventType.EDUCATION_MODULE_STARTED,
      description: `Started education module: ${moduleId}`,
      metadata: { moduleId, moduleTitle: module.title },
    });

    return {
      module: {
        id: module.id,
        title: module.title,
        content: module.content,
        completionType: module.completionType,
      },
      progress: completion,
    };
  }

  async updateProgress(
    telegramUserId: bigint,
    moduleId: string,
    currentSlideIndex: number,
    timeSpentSeconds: number,
  ) {
    const completion = await this.prisma.educationCompletion.findUnique({
      where: {
        telegramUserId_moduleId: {
          telegramUserId,
          moduleId: moduleId as EducationModuleId,
        },
      },
    });
    if (!completion) throw new NotFoundException('MODULE_PROGRESS_NOT_FOUND');

    return this.prisma.educationCompletion.update({
      where: {
        telegramUserId_moduleId: {
          telegramUserId,
          moduleId: moduleId as EducationModuleId,
        },
      },
      data: {
        currentSlideIndex,
        timeSpentSeconds: completion.timeSpentSeconds + timeSpentSeconds,
      },
    });
  }

  async submitQuizAnswer(
    telegramUserId: bigint,
    moduleId: string,
    questionIndex: number,
    selectedIndex: number,
  ) {
    const module = await this.prisma.educationModule.findUnique({
      where: { id: moduleId as EducationModuleId },
    });
    if (!module) throw new NotFoundException('MODULE_NOT_FOUND');

    const content = module.content as any[];
    const questions = content.filter((c) => c.type === 'quiz_question');
    const question = questions[questionIndex];
    if (!question) throw new BadRequestException('INVALID_QUESTION_INDEX');

    const correct = selectedIndex === question.correctIndex;
    const answer: QuizAnswer = { questionIndex, selectedIndex, correct };

    const completion = await this.prisma.educationCompletion.findUnique({
      where: {
        telegramUserId_moduleId: {
          telegramUserId,
          moduleId: moduleId as EducationModuleId,
        },
      },
    });

    const existingAnswers: QuizAnswer[] = (completion?.answers as unknown as QuizAnswer[]) || [];
    existingAnswers[questionIndex] = answer;

    await this.prisma.educationCompletion.update({
      where: {
        telegramUserId_moduleId: {
          telegramUserId,
          moduleId: moduleId as EducationModuleId,
        },
      },
      data: { answers: existingAnswers as any },
    });

    await this.auditService.create({
      telegramUserId,
      eventType: AuditEventType.EDUCATION_QUIZ_ANSWERED,
      description: `Quiz answer: Q${questionIndex} ${correct ? 'correct' : 'incorrect'}`,
      metadata: { moduleId, questionIndex, selectedIndex, correct },
    });

    return { correct, correctAnswer: question.correctIndex, explanation: question.explanation };
  }

  async completeModule(telegramUserId: bigint, moduleId: string) {
    const module = await this.prisma.educationModule.findUnique({
      where: { id: moduleId as EducationModuleId },
    });
    if (!module) throw new NotFoundException('MODULE_NOT_FOUND');

    const completion = await this.prisma.educationCompletion.findUnique({
      where: {
        telegramUserId_moduleId: {
          telegramUserId,
          moduleId: moduleId as EducationModuleId,
        },
      },
    });
    if (!completion) throw new NotFoundException('MODULE_PROGRESS_NOT_FOUND');

    let passed: boolean | null = null;
    let score = 0;
    let maxScore = 0;

    if (module.completionType === 'quiz_pass') {
      const answers = (completion.answers as unknown as QuizAnswer[]) || [];
      const content = module.content as any[];
      const questions = content.filter((c) => c.type === 'quiz_question');
      maxScore = questions.length;
      score = answers.filter((a) => a?.correct).length;
      const threshold = module.passThreshold || Math.ceil(maxScore * 0.8);
      passed = score >= threshold;

      if (!passed) {
        await this.prisma.educationCompletion.update({
          where: {
            telegramUserId_moduleId: {
              telegramUserId,
              moduleId: moduleId as EducationModuleId,
            },
          },
          data: {
            attempts: { increment: 1 },
            score,
            maxScore,
            passed: false,
          },
        });

        await this.auditService.create({
          telegramUserId,
          eventType: AuditEventType.EDUCATION_QUIZ_COMPLETED,
          description: `Quiz failed: ${score}/${maxScore} (threshold: ${threshold})`,
          metadata: { moduleId, score, maxScore, threshold, passed: false },
        });

        throw new BadRequestException({
          message: 'QUIZ_NOT_PASSED',
          score,
          maxScore,
          threshold,
          required: threshold,
        });
      }
    }

    const updated = await this.prisma.educationCompletion.update({
      where: {
        telegramUserId_moduleId: {
          telegramUserId,
          moduleId: moduleId as EducationModuleId,
        },
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        score,
        maxScore,
        passed: passed ?? true,
      },
    });

    await this.auditService.create({
      telegramUserId,
      eventType: AuditEventType.EDUCATION_MODULE_COMPLETED,
      description: `Completed module: ${module.id}`,
      metadata: { moduleId, moduleTitle: module.title, score, passed },
    });

    const allCompleted = await this.checkAllModulesCompleted(telegramUserId);
    if (allCompleted) {
      await this.prisma.user.update({
        where: { telegramUserId },
        data: { state: UserState.CONSENT_REQUIRED },
      });

      await this.auditService.create({
        telegramUserId,
        eventType: AuditEventType.EDUCATION_ALL_COMPLETED,
        description: 'All mandatory education modules completed',
      });

      await this.prisma.userStateTransition.create({
        data: {
          telegramUserId,
          fromState: UserState.EDUCATION_REQUIRED,
          toState: UserState.CONSENT_REQUIRED,
          reason: 'All mandatory modules completed; consent is now required',
          triggerEvent: 'education_service',
        },
      });

      await this.auditService.create({
        telegramUserId,
        eventType: AuditEventType.USER_STATE_CHANGED,
        description: `State transition: EDUCATION_REQUIRED -> CONSENT_REQUIRED`,
        metadata: { fromState: UserState.EDUCATION_REQUIRED, toState: UserState.CONSENT_REQUIRED },
      });
    }

    return updated;
  }

  private async checkAllModulesCompleted(telegramUserId: bigint): Promise<boolean> {
    const mandatoryModules = await this.prisma.educationModule.count({
      where: { isActive: true, mandatory: true },
    });
    if (mandatoryModules === 0) return false;

    const completedCount = await this.prisma.educationCompletion.count({
      where: {
        telegramUserId,
        status: 'COMPLETED',
        module: { isActive: true, mandatory: true },
      },
    });

    return completedCount >= mandatoryModules;
  }

  async getModuleContent(moduleId: string) {
    const module = await this.prisma.educationModule.findUnique({
      where: { id: moduleId as EducationModuleId },
    });
    if (!module) throw new NotFoundException('MODULE_NOT_FOUND');
    return module.content;
  }

  private filterContentByProgress(content: any[], progress: any) {
    if (!progress || progress.status === 'COMPLETED') return content;
    return content;
  }
}
