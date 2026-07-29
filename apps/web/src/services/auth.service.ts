import type { ApiResponse } from './api';

export interface UserProfile {
  id: string;
  telegramId: string;
  username: string;
  firstName: string;
  lastName?: string;
  role: string;
}

export const authService = {
  async authenticate(_initData: string): Promise<ApiResponse<{ token: string; user: UserProfile }>> {
    // Placeholder - Stage 3 will connect to NestJS endpoint
    return {
      success: true,
      data: {
        token: 'mock-jwt-token',
        user: {
          id: '18273645',
          telegramId: '18273645',
          username: 'demo_user',
          firstName: 'Demo',
          role: 'USER',
        },
      },
    };
  },
};
