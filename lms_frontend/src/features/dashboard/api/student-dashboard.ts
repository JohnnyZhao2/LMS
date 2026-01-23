import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { StudentDashboard } from '@/types/api';

/**
 * 获取学员仪表盘数据
 */
export const useStudentDashboard = (knowledgeLimit = 6, pendingLimit = 10) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: ['student-dashboard', currentRole ?? 'UNKNOWN', knowledgeLimit, pendingLimit],
    queryFn: () =>
      apiClient.get<StudentDashboard>(
        `/dashboard/student/?knowledge_limit=${knowledgeLimit}&pending_limit=${pendingLimit}`,
      ),
    enabled: currentRole !== null,
  });
};
