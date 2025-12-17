/**
 * Assign Roles API
 * Assigns roles to a user
 * @module features/user-mgmt/api/users/assign-roles
 * Requirements: 18.7 - Role configuration (student role cannot be removed)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { AssignRolesRequest, UserDetail } from './types';
import { userKeys } from './keys';

/**
 * Assign roles to a user
 * Requirements: 18.7 - Role configuration (student role cannot be removed)
 * @param id - User ID
 * @param data - Roles to assign
 * @returns Updated user
 */
export async function assignRoles(id: number | string, data: AssignRolesRequest): Promise<UserDetail> {
  return api.post<UserDetail>(API_ENDPOINTS.users.assignRoles(id), data);
}

/**
 * Hook to assign roles to a user
 */
export function useAssignRoles() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: AssignRolesRequest }) => 
      assignRoles(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
    },
  });
}
