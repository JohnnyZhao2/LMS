import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterUserMutation } from '@/lib/cache-invalidation/users';

export const deleteUser = (id: number) => apiClient.delete<void>(`/users/${id}/`);

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () =>
      invalidateAfterUserMutation(queryClient, {
        includeMentors: true,
        includeAssignableUsers: true,
      }),
  });
};
