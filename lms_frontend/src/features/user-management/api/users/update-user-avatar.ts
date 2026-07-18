import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterUserMutation } from '@/lib/cache-invalidation/users';
import type { UserList } from '@/types/common';
import type { UpdateAvatarRequest } from '@/types/user-api';

export const updateUserAvatar = ({ id, data }: { id: number; data: UpdateAvatarRequest }) =>
  apiClient.patch<UserList>(`/users/${id}/avatar/`, data);

export const useUpdateUserAvatar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateUserAvatar,
    onSuccess: () =>
      invalidateAfterUserMutation(queryClient, {
        includeMentors: true,
        includeAssignableUsers: true,
      }),
  });
};
