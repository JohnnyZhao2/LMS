import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterAuthorizationOverrideMutation } from '@/lib/cache-invalidation/authorization';
import type {
  CreateUserScopeGroupOverrideRequest,
  UserScopeGroupOverride,
} from '@/types/authorization';

interface CreateUserScopeGroupOverridePayload {
  userId: number;
  data: CreateUserScopeGroupOverrideRequest;
}

export const createUserScopeGroupOverride = ({
  userId,
  data,
}: CreateUserScopeGroupOverridePayload) =>
  apiClient.post<UserScopeGroupOverride>(
    `/authorization/users/${userId}/scope-group-overrides/`,
    data,
  );

export const useCreateUserScopeGroupOverride = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUserScopeGroupOverride,
    onSuccess: () => invalidateAfterAuthorizationOverrideMutation(queryClient),
  });
};
