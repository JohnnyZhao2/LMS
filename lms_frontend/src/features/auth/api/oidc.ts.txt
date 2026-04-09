import { apiClient } from '@/lib/api-client';
import type { LoginResponse, OidcAuthorizeUrlResponse, OidcCodeLoginRequest } from '@/types/api';

export const oidcApi = {
  getAuthorizeUrl: async (): Promise<OidcAuthorizeUrlResponse> => {
    return apiClient.get<OidcAuthorizeUrlResponse>('/auth/oidc/authorize-url/', { skipAuth: true });
  },

  codeLogin: async (data: OidcCodeLoginRequest): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>('/auth/oidc/code-login/', data, { skipAuth: true });
  },
};
