import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { TeamManagerDashboard } from '@/features/dashboard/types/dashboard';

export const getTeamManagerDashboard = () =>
  apiClient.get<TeamManagerDashboard>('/dashboard/team-manager/');

/**
 * 获取团队经理仪表盘数据
 */
export const useTeamManagerDashboard = () => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: queryKeys.dashboards.teamManager(currentRole),
    queryFn: getTeamManagerDashboard,
    enabled: currentRole === 'TEAM_MANAGER',
    staleTime: 0,
    refetchOnMount: 'always',
  });
};
