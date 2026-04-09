import { apiClient } from '@/lib/api-client';
import type { MeResponse } from '@/types/api';

export const meApi = {
  getMe: async (): Promise<MeResponse> => {
    return apiClient.get<MeResponse>('/auth/me/');
  },
};
