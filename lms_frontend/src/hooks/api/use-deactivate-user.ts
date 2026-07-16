import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterUserMutation } from '@/lib/cache-invalidation/users';
import type { UserList } from '@/types/common';

export const deactivateUser = (id: number) =>
  apiClient.post<UserList>(`/users/${id}/deactivate/`);

export const useDeactivateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deactivateUser,
    onSuccess: () =>
      invalidateAfterUserMutation(queryClient, {
        includeMentors: true,
        includeAssignableUsers: true,
      }),
  });
};
