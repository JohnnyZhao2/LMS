import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { UserList } from '@/types/api';

/**
 * 获取可分配学员列表
 */
export const useAssignableUsers = () => {
  return useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => apiClient.get<UserList[]>('/tasks/assignable-users/'),
  });
};


