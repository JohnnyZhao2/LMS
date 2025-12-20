import { apiClient } from '@/lib/api-client';
import type { SwitchRoleRequest, SwitchRoleResponse } from '@/types/api';

/**
 * 切换角色 API
 */
export const switchRoleApi = {
  /**
   * 切换当前角色
   */
  switchRole: async (data: SwitchRoleRequest): Promise<SwitchRoleResponse> => {
    return apiClient.post<SwitchRoleResponse>('/auth/switch-role/', data);
  },
};

