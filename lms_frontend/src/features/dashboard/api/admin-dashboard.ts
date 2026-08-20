import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/lib/auth';
import type { AdminDashboard } from '@/features/dashboard/types';

/**
 * 获取管理员仪表盘数据
 */
export const useAdminDashboard = () => {
  const { managementRole, user } = useAuth();

  return useQuery({
    queryKey: queryKeys.dashboards.admin(),
    queryFn: () => apiClient.get<AdminDashboard>('/dashboard/admin/'),
    enabled: managementRole === 'ADMIN' || Boolean(user?.is_superuser),
    staleTime: 0,
    refetchOnMount: 'always',
  });
};
