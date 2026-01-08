import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { MentorDashboard } from '@/types/api';

/**
 * 获取导师/室经理仪表盘数据
 */
export const useMentorDashboard = () => {
  return useQuery({
    queryKey: ['mentor-dashboard'],
    queryFn: () => apiClient.get<MentorDashboard>('/dashboard/mentor/'),
  });
};
