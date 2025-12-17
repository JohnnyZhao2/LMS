/**
 * Logout API
 * Handles user logout and token invalidation
 * @module features/auth/api/logout
 * Requirements: 1.5 - Call logout API to invalidate server-side tokens
 */

import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { LogoutRequest } from '@/types/api';

/**
 * Logout and invalidate tokens
 * @param request - Optional logout request with refresh token
 * Requirements: 1.5 - Call logout API to invalidate server-side tokens
 */
export async function logout(request?: LogoutRequest): Promise<void> {
  return api.post<void>(API_ENDPOINTS.auth.logout, request);
}
