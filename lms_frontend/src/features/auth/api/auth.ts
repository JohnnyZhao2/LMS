/**
 * Authentication API
 * Handles login, logout, refresh, and role switching API calls
 * Requirements: 1.2, 1.5, 1.6, 2.3
 */

import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  SwitchRoleRequest,
  SwitchRoleResponse,
  LogoutRequest,
} from '@/types/api';

/**
 * Login with username and password
 * Requirements: 1.2 - Call login API and receive JWT tokens
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  return api.post<LoginResponse>(API_ENDPOINTS.auth.login, credentials, {
    skipAuth: true,
  });
}

/**
 * Logout and invalidate tokens
 * Requirements: 1.5 - Call logout API to invalidate server-side tokens
 */
export async function logout(request?: LogoutRequest): Promise<void> {
  return api.post<void>(API_ENDPOINTS.auth.logout, request);
}

/**
 * Refresh access token using refresh token
 * Requirements: 1.6 - Refresh token when access token expires
 */
export async function refreshToken(
  request: RefreshTokenRequest
): Promise<RefreshTokenResponse> {
  return api.post<RefreshTokenResponse>(API_ENDPOINTS.auth.refresh, request, {
    skipAuth: true,
  });
}

/**
 * Switch to a different role
 * Requirements: 2.3 - Call role switch API and receive new tokens
 */
export async function switchRole(
  request: SwitchRoleRequest
): Promise<SwitchRoleResponse> {
  return api.post<SwitchRoleResponse>(API_ENDPOINTS.auth.switchRole, request);
}

/**
 * Auth API object for convenient imports
 */
export const authApi = {
  login,
  logout,
  refreshToken,
  switchRole,
};

export default authApi;
