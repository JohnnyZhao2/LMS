import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { MentorDashboard, StudentsNeedingAttentionResponse } from '@/types/api';

/**
 * 获取导师/室经理仪表盘数据
 */
export const useMentorDashboard = () => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: ['mentor-dashboard', currentRole ?? 'UNKNOWN'],
    queryFn: () => apiClient.get<MentorDashboard>('/dashboard/mentor/'),
    enabled: currentRole !== null,
    staleTime: 0, // 数据立即过期，确保角色切换时重新获取
    refetchOnMount: 'always', // 组件挂载时总是重新获取
  });
};

/**
 * 获取需要关注的学员
 */
export const useStudentsNeedingAttention = (limit: number = 10) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: ['students-needing-attention', currentRole ?? 'UNKNOWN', limit],
    queryFn: () => apiClient.get<StudentsNeedingAttentionResponse>(
      `/dashboard/mentor/students-needing-attention/?limit=${limit}`
    ),
    enabled: currentRole !== null && ['MENTOR', 'DEPT_MANAGER'].includes(currentRole),
    staleTime: 0,
    refetchOnMount: 'always',
  });
};
