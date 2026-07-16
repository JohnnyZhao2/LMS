import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { UserList } from '@/types/common';

export const getUser = (id: number) => apiClient.get<UserList>(`/users/${id}/`);

export const useUserDetail = (id: number) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: queryKeys.users.detail({ currentRole, id }),
    queryFn: () => getUser(id),
    enabled: Boolean(id) && currentRole !== null,
  });
};
