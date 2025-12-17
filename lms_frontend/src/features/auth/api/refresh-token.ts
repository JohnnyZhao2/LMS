/**
 * Refresh Token API
 * Handles access token refresh using refresh token
 * @module features/auth/api/refresh-token
 * Requirements: 1.6 - Refresh token when access token expires
 */

import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { RefreshTokenRequest, RefreshTokenResponse } from '@/types/api';

/**
 * Refresh access token using refresh token
 * @param request - Refresh token request
 * @returns New access token
 * Requirements: 1.6 - Refresh token when access token expires
 */
export async function refreshToken(
  request: RefreshTokenRequest
): Promise<RefreshTokenResponse> {
  return api.post<RefreshTokenResponse>(API_ENDPOINTS.auth.refresh, request, {
    skipAuth: true,
  });
}
