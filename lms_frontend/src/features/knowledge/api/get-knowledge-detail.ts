import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { StudentKnowledgeDetail } from '@/types/api';

/**
 * 获取知识详情
 */
export const useKnowledgeDetail = (id: number) => {
  return useQuery({
    queryKey: ['knowledge-detail', id],
    queryFn: () => apiClient.get<StudentKnowledgeDetail>(`/analytics/knowledge-center/${id}/`),
    enabled: !!id,
  });
};

