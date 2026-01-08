import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { StudentDashboard } from '@/types/api';

/**
 * 获取学员仪表盘数据
 */
export const useStudentDashboard = (knowledgeLimit = 5, pendingLimit = 10) => {
  return useQuery({
    queryKey: ['student-dashboard', knowledgeLimit, pendingLimit],
    queryFn: () =>
      apiClient.get<StudentDashboard>(
        `/dashboard/student/?knowledge_limit=${knowledgeLimit}&pending_limit=${pendingLimit}`,
      ),
  });
};
