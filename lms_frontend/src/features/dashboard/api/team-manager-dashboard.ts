import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/features/auth/stores/auth-context';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { TeamManagerDashboard } from '@/types/dashboard';

/**
 * 获取团队经理仪表盘数据
 */
export const useTeamManagerDashboard = () => {
  const currentRole = useCurrentRole();
  const { hasCapability } = useAuth();
  return useQuery({
    queryKey: ['team-manager-dashboard', currentRole ?? 'UNKNOWN'],
    queryFn: () => apiClient.get<TeamManagerDashboard>('/dashboard/team-manager/'),
    enabled: hasCapability('dashboard.team_manager.view'),
    staleTime: 0,
    refetchOnMount: 'always',
  });
};
