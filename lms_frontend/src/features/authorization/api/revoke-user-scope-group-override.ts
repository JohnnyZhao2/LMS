import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterAuthorizationOverrideMutation } from '@/lib/cache-invalidation/authorization';
import type { UserScopeGroupOverride } from '@/types/authorization';

interface RevokeUserScopeGroupOverridePayload {
  userId: number;
  overrideId: number;
}

export const revokeUserScopeGroupOverride = ({
  userId,
  overrideId,
}: RevokeUserScopeGroupOverridePayload) =>
  apiClient.delete<UserScopeGroupOverride>(
    `/authorization/users/${userId}/scope-group-overrides/${overrideId}/`,
  );

export const useRevokeUserScopeGroupOverride = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeUserScopeGroupOverride,
    onSuccess: () => invalidateAfterAuthorizationOverrideMutation(queryClient),
  });
};
