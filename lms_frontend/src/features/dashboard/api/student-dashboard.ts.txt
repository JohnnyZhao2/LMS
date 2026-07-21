import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { StudentDashboard } from '@/features/dashboard/types/dashboard';

export const getStudentDashboard = (taskLimit: number, knowledgeLimit: number) =>
  apiClient.get<StudentDashboard>(
    `/dashboard/student/?task_limit=${taskLimit}&knowledge_limit=${knowledgeLimit}`,
  );

/**
 * 获取学员仪表盘数据
 */
export const useStudentDashboard = (taskLimit = 10, knowledgeLimit = 6) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: queryKeys.dashboards.student({ currentRole, taskLimit, knowledgeLimit }),
    queryFn: () => getStudentDashboard(taskLimit, knowledgeLimit),
    enabled: currentRole === 'STUDENT',
  });
};
