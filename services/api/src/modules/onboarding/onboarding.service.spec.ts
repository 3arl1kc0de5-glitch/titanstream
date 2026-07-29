import { BadRequestException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { UserState } from '../../common/interfaces/user-state.enum';

describe('OnboardingService', () => {
  const telegramUserId = 123456789n;
  let prisma: any;
  let service: OnboardingService;

  beforeEach(() => {
    const user = { telegramUserId, state: UserState.AUTHENTICATED, isReady: false };
    const progress = { telegramUserId, currentStep: 'welcome', stepsCompleted: [], isCompleted: false };

    prisma = {
      user: {
        findUnique: jest.fn(async () => user),
        update: jest.fn(async ({ data }: any) => Object.assign(user, data)),
      },
      onboardingProgress: {
        findUnique: jest.fn(async () => progress),
        upsert: jest.fn(async () => progress),
      },
      educationModule: { count: jest.fn(async () => 5) },
      educationCompletion: { count: jest.fn(async () => 0) },
      userConsent: { count: jest.fn(async () => 0) },
      userStateTransition: { create: jest.fn(async () => ({})) },
    };

    service = new OnboardingService(prisma, { create: jest.fn(async () => ({})) } as any);
  });

  it('starts onboarding and records state history', async () => {
    await service.startOnboarding(telegramUserId);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { telegramUserId },
      data: { state: UserState.ONBOARDING_STARTED },
    });
    expect(prisma.userStateTransition.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        telegramUserId,
        fromState: UserState.AUTHENTICATED,
        toState: UserState.ONBOARDING_STARTED,
      }),
    });
  });

  it('rejects invalid state jumps', async () => {
    await expect(service.transition(telegramUserId, UserState.READY, 'test')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows resume by reading persisted progress', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ telegramUserId, state: UserState.ONBOARDING_STALLED, isReady: false });

    await expect(service.resumeOnboarding(telegramUserId)).resolves.toEqual(
      expect.objectContaining({ currentStep: 'welcome' }),
    );
  });
});
