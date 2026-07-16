import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { UserScopeGroupOverride } from '@/types/authorization';

export const getUserScopeGroupOverrides = (userId: number) =>
  apiClient.get<UserScopeGroupOverride[]>(
    `/authorization/users/${userId}/scope-group-overrides/`,
  );

export const useUserScopeGroupOverrides = (userId: number | null, enabled = true) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: queryKeys.authorization.userScopeGroupOverrides({ currentRole, userId }),
    queryFn: () => getUserScopeGroupOverrides(userId!),
    enabled: currentRole !== null && Boolean(userId) && enabled,
  });
};
