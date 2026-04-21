import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentRole } from '@/session/hooks/use-current-role';
import type { UserList } from '@/types/common';

/**
 * 获取可分配学员列表
 */
export const useAssignableUsers = () => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: queryKeys.users.assignable(currentRole),
    queryFn: () => apiClient.get<UserList[]>('/tasks/assignable-users/'),
    enabled: currentRole !== null,
  });
};
