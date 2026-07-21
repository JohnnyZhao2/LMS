import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterUserMutation } from '@/lib/cache-invalidation/users';
import type { UserInfo } from '@/types/common';
import type { UpdateAvatarRequest } from '@/types/user-api';

export const updateMyAvatar = (data: UpdateAvatarRequest) =>
  apiClient.patch<UserInfo>('/users/me/avatar/', data);

export const useUpdateMyAvatar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMyAvatar,
    onSuccess: () =>
      invalidateAfterUserMutation(queryClient, {
        includeMentors: true,
        includeAssignableUsers: true,
      }),
  });
};
