/**
 * Login API
 * Handles user login with username and password
 * @module features/auth/api/login
 * Requirements: 1.2 - Call login API and receive JWT tokens
 */

import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { LoginRequest, LoginResponse } from '@/types/api';

/**
 * Login with username and password
 * @param credentials - User login credentials
 * @returns Login response with tokens and user info
 * Requirements: 1.2 - Call login API and receive JWT tokens
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  return api.post<LoginResponse>(API_ENDPOINTS.auth.login, credentials, {
    skipAuth: true,
  });
}
