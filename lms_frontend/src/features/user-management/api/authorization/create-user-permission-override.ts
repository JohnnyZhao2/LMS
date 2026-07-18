import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterAuthorizationOverrideMutation } from '@/lib/cache-invalidation/authorization';
import type {
  CreateUserPermissionOverrideRequest,
  UserPermissionOverride,
} from '@/types/authorization';

interface CreateUserOverridePayload {
  userId: number;
  data: CreateUserPermissionOverrideRequest;
}

export const createUserPermissionOverride = ({ userId, data }: CreateUserOverridePayload) =>
  apiClient.post<UserPermissionOverride>(`/authorization/users/${userId}/overrides/`, data);

export const useCreateUserPermissionOverride = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUserPermissionOverride,
    onSuccess: () => invalidateAfterAuthorizationOverrideMutation(queryClient),
  });
};
