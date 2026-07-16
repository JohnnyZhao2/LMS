import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterUserMutation } from '@/lib/cache-invalidation/users';
import type { UserList } from '@/types/common';

export const activateUser = (id: number) =>
  apiClient.post<UserList>(`/users/${id}/activate/`);

export const useActivateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: activateUser,
    onSuccess: () =>
      invalidateAfterUserMutation(queryClient, {
        includeMentors: true,
        includeAssignableUsers: true,
      }),
  });
};
