import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterAuthorizationOverrideMutation } from '@/lib/cache-invalidation/authorization';
import type { UserPermissionOverride } from '@/types/authorization';

interface RevokeUserOverridePayload {
  userId: number;
  overrideId: number;
}

export const revokeUserPermissionOverride = ({ userId, overrideId }: RevokeUserOverridePayload) =>
  apiClient.delete<UserPermissionOverride>(
    `/authorization/users/${userId}/overrides/${overrideId}/`,
  );

export const useRevokeUserPermissionOverride = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeUserPermissionOverride,
    onSuccess: () => invalidateAfterAuthorizationOverrideMutation(queryClient),
  });
};
