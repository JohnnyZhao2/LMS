import { apiClient } from '@/lib/api-client';
import type { LoginRequest, LoginResponse } from '@/types/api';

/**
 * 登录 API
 */
export const loginApi = {
  /**
   * 用户登录
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>('/auth/login/', data, { skipAuth: true });
  },
};

