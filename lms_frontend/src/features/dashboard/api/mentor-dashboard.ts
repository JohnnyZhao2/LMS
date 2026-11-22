import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/lib/auth';
import type { MentorDashboard } from '@/features/dashboard/types';

/**
 * 获取导师/室经理仪表盘数据
 */
export const useMentorDashboard = () => {
  const { hasCapability, hasFullScopeCapability } = useAuth();
  return useQuery({
    queryKey: queryKeys.dashboards.mentor(),
    queryFn: () => apiClient.get<MentorDashboard>('/dashboard/mentor/'),
    enabled: hasCapability('tasks.view_task_analytics') && !hasFullScopeCapability('tasks.view_task_analytics'),
    staleTime: 0,
    refetchOnMount: 'always',
  });
};
