import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { KnowledgeDetail } from '@/types/api';

/**
 * 获取学员知识详情
 * 
 * 学员只能查看已发布的知识文档
 * @param id - 知识ID
 */
export const useStudentKnowledgeDetail = (id: number) => {
  return useQuery({
    queryKey: ['student-knowledge-detail', id],
    queryFn: () => apiClient.get<KnowledgeDetail>(`/knowledge/${id}/`),
    enabled: !!id,
  });
};

