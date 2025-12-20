import { apiClient } from '@/lib/api-client';
import type { LogoutRequest } from '@/types/api';

/**
 * 登出 API
 */
export const logoutApi = {
  /**
   * 用户登出
   */
  logout: async (data?: LogoutRequest): Promise<void> => {
    await apiClient.post('/auth/logout/', data);
  },
};

