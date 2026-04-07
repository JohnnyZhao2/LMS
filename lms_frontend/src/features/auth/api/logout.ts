import { apiClient } from '@/lib/api-client';
import type { LogoutRequest } from '@/types/api';

export const logoutApi = {
  logout: async (data?: LogoutRequest): Promise<void> => {
    await apiClient.post('/auth/logout/', data);
  },
};
