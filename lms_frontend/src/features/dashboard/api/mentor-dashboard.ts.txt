import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { MentorDashboard } from '@/features/dashboard/types/dashboard';

export const getMentorDashboard = () =>
  apiClient.get<MentorDashboard>('/dashboard/mentor/');

/**
 * 获取导师/室经理仪表盘数据
 */
export const useMentorDashboard = () => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: queryKeys.dashboards.mentor(currentRole),
    queryFn: getMentorDashboard,
    enabled: currentRole === 'MENTOR' || currentRole === 'DEPT_MANAGER',
    staleTime: 0, // 数据立即过期，确保角色切换时重新获取
    refetchOnMount: 'always', // 组件挂载时总是重新获取
  });
};
