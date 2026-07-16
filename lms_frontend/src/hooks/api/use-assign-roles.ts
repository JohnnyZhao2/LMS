import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterUserMutation } from '@/lib/cache-invalidation/users';
import type { RoleCode, UserList } from '@/types/common';

export const assignRoles = ({ id, roles }: { id: number; roles: RoleCode[] }) =>
  apiClient.post<UserList>(`/users/${id}/assign-roles/`, { role_codes: roles });

export const useAssignRoles = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignRoles,
    onSuccess: () =>
      invalidateAfterUserMutation(queryClient, {
        includeMentors: true,
        includeAssignableUsers: true,
      }),
  });
};
