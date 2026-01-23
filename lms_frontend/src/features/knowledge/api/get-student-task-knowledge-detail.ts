import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { KnowledgeDetail } from '@/types/api';

/**
 * 获取学员任务知识详情（任务锁定版本）
 *
 * @param taskKnowledgeId - 任务知识关联ID
 */
export const useStudentTaskKnowledgeDetail = (taskKnowledgeId: number) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: ['student-task-knowledge-detail', currentRole ?? 'UNKNOWN', taskKnowledgeId],
    queryFn: () => apiClient.get<KnowledgeDetail>(`/knowledge/task/${taskKnowledgeId}/`),
    enabled: !!taskKnowledgeId && currentRole !== null,
  });
};
