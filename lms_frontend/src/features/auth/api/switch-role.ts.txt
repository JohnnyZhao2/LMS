import { apiClient } from '@/lib/api-client';
import type { SwitchRoleRequest, SwitchRoleResponse } from '@/types/api';

export const switchRoleApi = {
  switchRole: async (data: SwitchRoleRequest): Promise<SwitchRoleResponse> => {
    return apiClient.post<SwitchRoleResponse>('/auth/switch-role/', data);
  },
};
