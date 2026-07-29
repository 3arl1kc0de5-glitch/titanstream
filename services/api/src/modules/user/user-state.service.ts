import { Injectable, BadRequestException } from '@nestjs/common';
import { UserState } from '../../common/interfaces/user-state.enum';
import { PrismaService } from '../../database/prisma.service';

interface StateConfig {
  allowedTransitions: string[];
  blockedActions: string[];
  allowedActions?: string[];
  description: string;
}

const STATE_MACHINE: Record<string, StateConfig> = {
  NEW: { allowedTransitions: ['AUTHENTICATED'], blockedActions: ['MINE', 'WITHDRAW'], description: 'Created user' },
  AUTHENTICATED: { allowedTransitions: ['ONBOARDING_STARTED'], blockedActions: ['MINE', 'WITHDRAW'], description: 'Authenticated user' },
  ONBOARDING_STARTED: { allowedTransitions: ['EDUCATION_REQUIRED'], blockedActions: ['MINE', 'WITHDRAW'], description: 'Onboarding started' },
  EDUCATION_REQUIRED: { allowedTransitions: ['EDUCATION_COMPLETE'], blockedActions: ['MINE', 'WITHDRAW'], description: 'Education required' },
  EDUCATION_COMPLETE: { allowedTransitions: ['CONSENT_REQUIRED'], blockedActions: ['MINE', 'WITHDRAW'], description: 'Education complete' },
  CONSENT_REQUIRED: { allowedTransitions: ['READY'], blockedActions: ['MINE', 'WITHDRAW'], description: 'Consent required' },
  READY: { allowedTransitions: ['ACTIVE_USER'], blockedActions: ['WITHDRAW'], allowedActions: ['MINE'], description: 'Ready user' },
};

@Injectable()
export class StateMachineService {
  constructor(private readonly prisma: PrismaService) {}

  getConfig(state: string): StateConfig | undefined {
    return STATE_MACHINE[state];
  }

  async transitionTo(telegramUserId: bigint, targetState: UserState): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { telegramUserId }, select: { state: true } });
    if (!user) throw new BadRequestException({ code: 'USER_NOT_FOUND', message: 'User not found' });

    const config = STATE_MACHINE[user.state];
    if (!config?.allowedTransitions.includes(targetState)) {
      throw new BadRequestException({ code: 'INVALID_TRANSITION', message: `Cannot transition from '${user.state}' to '${targetState}'` });
    }

    await this.prisma.user.update({ where: { telegramUserId }, data: { state: targetState } });
  }

  async checkAction(state: string, action: string) {
    const config = STATE_MACHINE[state];
    if (!config) return { allowed: false, blockedActions: [], state };

    const blocked = config.blockedActions.includes(action);
    if (blocked) return { allowed: false, blockedActions: config.blockedActions, state };
    if (config.allowedActions?.length && !config.allowedActions.includes(action)) {
      return { allowed: false, blockedActions: config.blockedActions, state };
    }

    return { allowed: true, blockedActions: config.blockedActions, state };
  }

  getAllowedTransitions(state: string): string[] {
    return STATE_MACHINE[state]?.allowedTransitions ?? [];
  }
}
