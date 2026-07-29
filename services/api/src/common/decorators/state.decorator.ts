import { SetMetadata } from '@nestjs/common';

export const RequireState = (state: string) => SetMetadata('state', state);
export const BlockedInStates = (states: string[]) => SetMetadata('blockedStates', states);
export const RequireAction = (action: string) => SetMetadata('action', action);
