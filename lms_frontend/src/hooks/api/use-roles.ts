import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { Role } from '@/types/common';

export const getRoles = () => apiClient.get<Role[]>('/users/roles/');

export const useRoles = () => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: queryKeys.users.roles(currentRole),
    queryFn: getRoles,
    enabled: currentRole !== null,
  });
};
