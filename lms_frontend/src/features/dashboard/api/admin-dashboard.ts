import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentRole } from '@/session/hooks/use-current-role';
import type { AdminDashboard } from '@/types/dashboard';

/**
 * 获取管理员仪表盘数据
 */
export const useAdminDashboard = () => {
  const currentRole = useCurrentRole();

  return useQuery({
    queryKey: queryKeys.dashboards.admin(currentRole),
    queryFn: () => apiClient.get<AdminDashboard>('/dashboard/admin/'),
    enabled: currentRole === 'ADMIN' || currentRole === 'SUPER_ADMIN',
    staleTime: 0,
    refetchOnMount: 'always',
  });
};
