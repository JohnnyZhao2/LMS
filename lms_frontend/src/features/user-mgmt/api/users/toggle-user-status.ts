/**
 * Toggle User Status API
 * Deactivates or activates a user
 * @module features/user-mgmt/api/users/toggle-user-status
 * Requirements: 18.4 - Deactivate user
 * Requirements: 18.5 - Activate user
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { UserDetail } from './types';
import { userKeys } from './keys';

/**
 * Deactivate a user
 * Requirements: 18.4 - Deactivate user
 * @param id - User ID
 * @returns Updated user
 */
export async function deactivateUser(id: number | string): Promise<UserDetail> {
  return api.post<UserDetail>(API_ENDPOINTS.users.deactivate(id), {});
}

/**
 * Activate a user
 * Requirements: 18.5 - Activate user
 * @param id - User ID
 * @returns Updated user
 */
export async function activateUser(id: number | string): Promise<UserDetail> {
  return api.post<UserDetail>(API_ENDPOINTS.users.activate(id), {});
}

/**
 * Hook to deactivate a user
 */
export function useDeactivateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deactivateUser,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
    },
  });
}

/**
 * Hook to activate a user
 */
export function useActivateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: activateUser,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
    },
  });
}
