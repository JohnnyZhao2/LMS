/**
 * Switch Role API
 * Handles role switching for multi-role users
 * @module features/auth/api/switch-role
 * Requirements: 2.3 - Call role switch API and receive new tokens
 */

import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { SwitchRoleRequest, SwitchRoleResponse } from '@/types/api';

/**
 * Switch to a different role
 * @param request - Switch role request with target role code
 * @returns New tokens and current role
 * Requirements: 2.3 - Call role switch API and receive new tokens
 */
export async function switchRole(
  request: SwitchRoleRequest
): Promise<SwitchRoleResponse> {
  return api.post<SwitchRoleResponse>(API_ENDPOINTS.auth.switchRole, request);
}
