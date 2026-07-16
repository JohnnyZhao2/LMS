import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { UserPermissionOverride } from '@/types/authorization';

export const getUserPermissionOverrides = (userId: number) =>
  apiClient.get<UserPermissionOverride[]>(`/authorization/users/${userId}/overrides/`);

export const useUserPermissionOverrides = (userId: number | null, enabled = true) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: queryKeys.authorization.userOverrides({ currentRole, userId }),
    queryFn: () => getUserPermissionOverrides(userId!),
    enabled: currentRole !== null && Boolean(userId) && enabled,
  });
};
