import { apiClient } from '@/lib/api-client';
import type { RefreshTokenRequest, RefreshTokenResponse } from '@/types/api';

/**
 * 刷新令牌 API
 */
export const refreshTokenApi = {
  /**
   * 刷新访问令牌
   */
  refresh: async (data: RefreshTokenRequest): Promise<RefreshTokenResponse> => {
    return apiClient.post<RefreshTokenResponse>('/auth/refresh/', data, { skipAuth: true });
  },
};

