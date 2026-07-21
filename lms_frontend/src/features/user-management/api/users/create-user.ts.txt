import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterUserMutation } from '@/lib/cache-invalidation/users';
import type { UserList } from '@/types/common';
import type { CreateUserRequest } from '@/types/user-api';

export const createUser = (data: CreateUserRequest) => apiClient.post<UserList>('/users/', data);

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => invalidateAfterUserMutation(queryClient, { includeAssignableUsers: true }),
  });
};
