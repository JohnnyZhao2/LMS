import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { StudentKnowledgeList } from '@/types/api';

interface GetKnowledgeListParams {
  page?: number;
  pageSize?: number;
  line_type_id?: number;
  system_tag_id?: number;
  knowledge_type?: 'EMERGENCY' | 'OTHER';
  search?: string;
}

/**
 * 获取知识列表
 */
export const useKnowledgeList = (params: GetKnowledgeListParams = {}) => {
  const { page = 1, pageSize = 20, line_type_id, system_tag_id, knowledge_type, search } = params;

  return useQuery({
    queryKey: ['knowledge-list', page, pageSize, line_type_id, system_tag_id, knowledge_type, search],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (page) searchParams.set('page', String(page));
      if (pageSize) searchParams.set('page_size', String(pageSize));
      if (line_type_id) searchParams.set('line_type_id', String(line_type_id));
      if (system_tag_id) searchParams.set('system_tag_id', String(system_tag_id));
      if (knowledge_type) searchParams.set('knowledge_type', knowledge_type);
      if (search) searchParams.set('search', search);

      return apiClient.get<StudentKnowledgeList[]>(`/analytics/knowledge-center/?${searchParams.toString()}`);
    },
  });
};
