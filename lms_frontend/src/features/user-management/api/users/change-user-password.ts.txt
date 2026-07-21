import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterUserMutation } from '@/lib/cache-invalidation/users';
import type { ChangePasswordRequest } from '@/types/user-api';

export const changeUserPassword = ({ userId, password }: ChangePasswordRequest) =>
  apiClient.post<void>('/auth/change-password/', { user_id: userId, password });

export const useChangePassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: changeUserPassword,
    onSuccess: () => invalidateAfterUserMutation(queryClient),
  });
};
