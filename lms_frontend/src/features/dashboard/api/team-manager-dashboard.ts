import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentRole } from '@/session/hooks/use-current-role';
import type { TeamManagerDashboard } from '@/types/dashboard';

/**
 * 获取团队经理仪表盘数据
 */
export const useTeamManagerDashboard = () => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: queryKeys.dashboards.teamManager(currentRole),
    queryFn: () => apiClient.get<TeamManagerDashboard>('/dashboard/team-manager/'),
    enabled: currentRole === 'TEAM_MANAGER',
    staleTime: 0,
    refetchOnMount: 'always',
  });
};
