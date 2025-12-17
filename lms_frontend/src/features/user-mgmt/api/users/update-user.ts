/**
 * Update User API
 * Updates user information
 * @module features/user-mgmt/api/users/update-user
 * Requirements: 18.3 - Edit user form
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { UserUpdateRequest, UserDetail } from './types';
import { userKeys } from './keys';

/**
 * Update user information
 * Requirements: 18.3 - Edit user form
 * @param id - User ID
 * @param data - User update data
 * @returns Updated user
 */
export async function updateUser(id: number | string, data: UserUpdateRequest): Promise<UserDetail> {
  return api.patch<UserDetail>(API_ENDPOINTS.users.update(id), data);
}

/**
 * Hook to update user information
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UserUpdateRequest }) => 
      updateUser(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
    },
  });
}
