import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentRole } from '@/session/hooks/use-current-role';
import type { MentorDashboard } from '@/types/dashboard';

/**
 * 获取导师/室组仪表盘数据
 */
export const useMentorDashboard = () => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: queryKeys.dashboards.mentor(currentRole),
    queryFn: () => apiClient.get<MentorDashboard>('/dashboard/mentor/'),
    enabled: currentRole === 'MENTOR' || currentRole === 'DEPT',
    staleTime: 0,
    refetchOnMount: 'always',
  });
};
