/**
 * Reset Password API
 * Resets user password (admin only)
 * @module features/user-mgmt/api/users/reset-password
 * Requirements: 18.6 - Reset password and show temporary password
 */

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { ResetPasswordResponse } from './types';

/**
 * Reset user password (admin only)
 * Requirements: 18.6 - Reset password and show temporary password
 * @param userId - User ID
 * @returns Temporary password
 */
export async function resetPassword(userId: number): Promise<ResetPasswordResponse> {
  return api.post<ResetPasswordResponse>(API_ENDPOINTS.users.resetPassword, { user_id: userId });
}

/**
 * Hook to reset user password
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: resetPassword,
  });
}
