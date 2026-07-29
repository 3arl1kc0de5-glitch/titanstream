import { SetMetadata } from '@nestjs/common';
import { UserState } from '../interfaces/user-state.enum';

export const STATES = (...states: UserState[]) => SetMetadata('states', states);
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);