import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/lib/auth';
import type { MentorDashboard } from '@/features/dashboard/types';

/**
 * 获取导师/室经理仪表盘数据
 */
export const useMentorDashboard = () => {
  const { managementRole } = useAuth();
  return useQuery({
    queryKey: queryKeys.dashboards.mentor(),
    queryFn: () => apiClient.get<MentorDashboard>('/dashboard/mentor/'),
    enabled: managementRole === 'MENTOR' || managementRole === 'DEPT_MANAGER',
    staleTime: 0,
    refetchOnMount: 'always',
  });
};
