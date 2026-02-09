import { apiClient } from '@/lib/api-client';
import type { MeResponse } from '@/types/api';

/**
 * 获取当前用户信息 API
 */
export const meApi = {
  /**
   * 获取当前登录用户的最新信息和角色列表
   */
  getMe: async (): Promise<MeResponse> => {
    return apiClient.get<MeResponse>('/auth/me/');
  },
};
