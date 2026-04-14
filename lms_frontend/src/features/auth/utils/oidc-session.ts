import { apiClient } from '@/lib/api-client';
import type { OidcAuthorizeUrlResponse } from '@/types/auth';

const OIDC_STATE_KEY = 'lms_oidc_state';

export const beginOidcLogin = async (): Promise<void> => {
  const result = await apiClient.get<OidcAuthorizeUrlResponse>('/auth/oidc/authorize-url/', {
    skipAuth: true,
  });
  window.sessionStorage.setItem(OIDC_STATE_KEY, result.state);
  window.location.assign(result.authorize_url);
};

export const consumeOidcCallbackCode = (searchParams: URLSearchParams): string | null => {
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const localState = window.sessionStorage.getItem(OIDC_STATE_KEY);

  window.sessionStorage.removeItem(OIDC_STATE_KEY);

  if (!code || !state || state !== localState) {
    return null;
  }

  return code;
};
