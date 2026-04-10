import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/features/auth/stores/auth-context';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { MentorDashboard } from '@/types/dashboard';

/**
 * 获取管理员仪表盘数据
 */
export const useAdminDashboard = () => {
  const currentRole = useCurrentRole();
  const { hasCapability } = useAuth();

  return useQuery({
    queryKey: ['admin-dashboard', currentRole ?? 'UNKNOWN'],
    queryFn: () => apiClient.get<MentorDashboard>('/dashboard/admin/'),
    enabled: currentRole !== null && hasCapability('dashboard.admin.view'),
    staleTime: 0,
    refetchOnMount: 'always',
  });
};
