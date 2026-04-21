import { apiClient } from '@/lib/api-client';
import type { OneAccountAuthorizeUrlResponse } from '@/types/auth';

export const beginOneAccountLogin = async (): Promise<void> => {
  const result = await apiClient.get<OneAccountAuthorizeUrlResponse>('/auth/one-account/authorize-url/', {
    skipAuth: true,
  });
  window.location.assign(result.authorize_url);
};
