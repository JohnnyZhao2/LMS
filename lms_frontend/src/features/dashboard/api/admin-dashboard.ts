import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useCurrentRole } from '@/session/hooks/use-current-role';
import type { MentorDashboard } from '@/types/dashboard';

/**
 * 获取管理员仪表盘数据
 */
export const useAdminDashboard = () => {
  const currentRole = useCurrentRole();

  return useQuery({
    queryKey: ['admin-dashboard', currentRole ?? 'UNKNOWN'],
    queryFn: () => apiClient.get<MentorDashboard>('/dashboard/admin/'),
    enabled: currentRole === 'ADMIN' || currentRole === 'SUPER_ADMIN',
    staleTime: 0,
    refetchOnMount: 'always',
  });
};
