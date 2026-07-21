import { apiClient } from '@/lib/api-client';
import type { OneAccountAuthorizeUrlResponse } from '@/types/auth';

export const getOneAccountAuthorizeUrl = () =>
  apiClient.get<OneAccountAuthorizeUrlResponse>(
    '/auth/one-account/authorize-url/',
    { skipAuth: true },
  );

export const beginOneAccountLogin = async (): Promise<void> => {
  const result = await getOneAccountAuthorizeUrl();
  window.location.assign(result.authorize_url);
};
