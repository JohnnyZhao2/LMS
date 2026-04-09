import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { UserList } from '@/types/api';

/**
 * 获取可分配学员列表
 */
export const useAssignableUsers = () => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: ['assignable-users', currentRole ?? 'UNKNOWN'],
    queryFn: () => apiClient.get<UserList[]>('/tasks/assignable-users/'),
    enabled: currentRole !== null,
  });
};

