import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { KnowledgeDetail } from '@/types/api';

/**
 * 获取学员知识详情
 * 
 * 使用专属的学员接口 /knowledge/student/{id}/，强制只返回已发布的知识文档。
 * 即使用户同时拥有管理员角色，此接口也只返回已发布内容，不会返回草稿版本。
 * 
 * @param id - 知识ID
 */
export const useStudentKnowledgeDetail = (id: number) => {
  return useQuery({
    queryKey: ['student-knowledge-detail', id],
    queryFn: () => apiClient.get<KnowledgeDetail>(`/knowledge/student/${id}/`),
    enabled: !!id,
  });
};

