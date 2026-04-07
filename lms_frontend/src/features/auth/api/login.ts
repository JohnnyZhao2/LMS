import { apiClient } from '@/lib/api-client';
import type { LoginRequest, LoginResponse } from '@/types/api';

export const loginApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>('/auth/login/', data, { skipAuth: true });
  },
};
