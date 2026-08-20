import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { UserList } from '@/types/common';

/**
 * 获取可分配人员列表
 */
export const useAssignableUsers = () => {
  return useQuery({
    queryKey: queryKeys.users.assignable(),
    queryFn: () => apiClient.get<UserList[]>('/tasks/assignable-users/'),
    enabled: true,
  });
};
