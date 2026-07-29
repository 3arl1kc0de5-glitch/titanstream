import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UserState, AuditEventType } from '../../common/interfaces/user-state.enum';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class OnboardingService {
  private readonly allowedTransitions: Record<UserState, UserState[]> = {
    [UserState.NEW]: [UserState.AUTHENTICATED],
    [UserState.AUTHENTICATED]: [UserState.ONBOARDING_STARTED],
    [UserState.ONBOARDING_STARTED]: [UserState.EDUCATION_REQUIRED],
    [UserState.EDUCATION_REQUIRED]: [UserState.EDUCATION_COMPLETE],
    [UserState.EDUCATION_COMPLETE]: [UserState.CONSENT_REQUIRED],
    [UserState.CONSENT_REQUIRED]: [UserState.READY],
    [UserState.READY]: [],
    [UserState.ONBOARDING_WELCOME]: [UserState.ONBOARDING_EDUCATION],
    [UserState.ONBOARDING_EDUCATION]: [UserState.EDUCATION_COMPLETE],
    [UserState.CONSENT_PENDING]: [UserState.READY_FOR_PLATFORM],
    [UserState.READY_FOR_PLATFORM]: [UserState.ELIGIBLE_USER, UserState.READY],
    [UserState.ELIGIBLE_USER]: [UserState.ACTIVE_USER],
    [UserState.ACTIVE_USER]: [UserState.DORMANT_USER, UserState.FROZEN],
    [UserState.DORMANT_USER]: [UserState.ACTIVE_USER],
    [UserState.ONBOARDING_STALLED]: [UserState.ONBOARDING_STARTED],
    [UserState.CONSENT_EXPIRED]: [UserState.CONSENT_REQUIRED],
    [UserState.FROZEN]: [UserState.ACTIVE_USER, UserState.SUSPENDED_USER],
    [UserState.SUSPENDED_USER]: [UserState.ACTIVE_USER, UserState.BANNED_USER],
    [UserState.BANNED_USER]: [],
    [UserState.DELETED_USER]: [],
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getProgress(telegramUserId: bigint) {
    const progress = await this.prisma.onboardingProgress.findUnique({
      where: { telegramUserId },
    });
    if (!progress) {
      throw new NotFoundException('ONBOARDING_NOT_FOUND');
    }
    return progress;
  }

  async startOnboarding(telegramUserId: bigint) {
    const user = await this.prisma.user.findUnique({ where: { telegramUserId } });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');

    const currentState = user.state as UserState;
    if (currentState !== UserState.AUTHENTICATED && currentState !== UserState.NEW) {
      throw new BadRequestException(`Cannot start onboarding from state ${currentState}`);
    }

    await this.transitionState(telegramUserId, UserState.ONBOARDING_STARTED, 'User started onboarding');

    const progress = await this.prisma.onboardingProgress.upsert({
      where: { telegramUserId },
      create: {
        telegramUserId,
        currentStep: 'welcome',
        stepsCompleted: [],
      },
      update: {
        currentStep: 'welcome',
        isCompleted: false,
        completedAt: null,
      },
    });

    await this.auditService.create({
      telegramUserId,
      eventType: AuditEventType.ONBOARDING_STARTED,
      description: 'User started the onboarding flow',
    });

    return progress;
  }

  async completeStep(telegramUserId: bigint, step: string) {
    const progress = await this.prisma.onboardingProgress.findUnique({
      where: { telegramUserId },
    });
    if (!progress) throw new NotFoundException('ONBOARDING_NOT_FOUND');

    const stepsCompleted: string[] = (progress.stepsCompleted as string[]) || [];
    if (!stepsCompleted.includes(step)) {
      stepsCompleted.push(step);
    }

    const updatedProgress = await this.prisma.onboardingProgress.update({
      where: { telegramUserId },
      data: {
        currentStep: step,
        stepsCompleted: stepsCompleted,
      },
    });

    await this.auditService.create({
      telegramUserId,
      eventType: AuditEventType.ONBOARDING_STEP_COMPLETED,
      description: `Completed onboarding step: ${step}`,
      metadata: { step, totalSteps: stepsCompleted.length },
    });

    return updatedProgress;
  }

  async transition(telegramUserId: bigint, newState: UserState, trigger = 'api', metadata: any = {}) {
    const user = await this.prisma.user.findUnique({ where: { telegramUserId } });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');

    const fromState = user.state as UserState;
    if (!this.allowedTransitions[fromState]?.includes(newState)) {
      throw new BadRequestException(`Invalid onboarding transition ${fromState} -> ${newState}`);
    }

    await this.transitionState(telegramUserId, newState, trigger, metadata);
    return this.getState(telegramUserId);
  }

  async resumeOnboarding(telegramUserId: bigint) {
    const user = await this.prisma.user.findUnique({ where: { telegramUserId } });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');

    const userState = user.state as UserState;
    if (userState === UserState.ONBOARDING_STALLED) {
      const progress = await this.prisma.onboardingProgress.findUnique({
        where: { telegramUserId },
      });
      if (!progress) throw new NotFoundException('ONBOARDING_NOT_FOUND');

      await this.transitionState(telegramUserId, UserState.ONBOARDING_STARTED, 'Resumed from stalled');

      await this.auditService.create({
        telegramUserId,
        eventType: AuditEventType.ONBOARDING_RESUMED,
        description: 'User resumed stalled onboarding',
        metadata: { previousStep: progress.currentStep },
      });

      return progress;
    }

    throw new BadRequestException(`Cannot resume onboarding from state ${userState}`);
  }

  async getState(telegramUserId: bigint) {
    const user = await this.prisma.user.findUnique({ where: { telegramUserId } });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');

    const progress = await this.prisma.onboardingProgress.findUnique({
      where: { telegramUserId },
    });

    const remainingModules = await this.countRemainingModules(telegramUserId);
    const consentsCompleted = await this.countConsentsCompleted(telegramUserId);

    return {
      state: user.state,
      progress: progress || { currentStep: 'welcome', stepsCompleted: [], isCompleted: false },
      remainingModules,
      consentsCompleted,
      isReady: user.isReady,
    };
  }

  private async countRemainingModules(telegramUserId: bigint): Promise<number> {
    const totalModules = await this.prisma.educationModule.count({
      where: { isActive: true, mandatory: true },
    });
    const completedModules = await this.prisma.educationCompletion.count({
      where: {
        telegramUserId,
        status: 'COMPLETED',
        module: { mandatory: true },
      },
    });
    return Math.max(0, totalModules - completedModules);
  }

  private async countConsentsCompleted(telegramUserId: bigint): Promise<number> {
    return this.prisma.userConsent.count({
      where: { telegramUserId, isActive: true },
    });
  }

  private async transitionState(telegramUserId: bigint, newState: UserState, reason: string, metadata: any = {}) {
    const user = await this.prisma.user.findUnique({ where: { telegramUserId } });
    if (!user) return;

    const fromState = user.state as UserState;

    await this.prisma.user.update({
      where: { telegramUserId },
      data: { state: newState },
    });

    await this.prisma.userStateTransition.create({
      data: {
        telegramUserId,
        fromState,
        toState: newState,
        reason,
        triggerEvent: reason,
        metadata,
      },
    });

    await this.auditService.create({
      telegramUserId,
      eventType: AuditEventType.USER_STATE_CHANGED,
      description: `State transition: ${fromState} -> ${newState}`,
      metadata: { fromState, toState: newState, trigger: reason, ...metadata },
    });
  }
}
