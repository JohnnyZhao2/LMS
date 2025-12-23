import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { KnowledgeType } from '@/types/api';

/**
 * 知识统计数据
 */
export interface KnowledgeStats {
  total: number;
  published: number;
  emergency: number;
  monthly_new: number;
}

/**
 * 获取知识统计参数
 */
interface GetKnowledgeStatsParams {
  knowledge_type?: KnowledgeType;
  line_type_id?: number;
  system_tag_id?: number;
  operation_tag_id?: number;
  search?: string;
}

/**
 * 获取知识统计数据
 * @param params - 筛选参数
 */
export const useKnowledgeStats = (params: GetKnowledgeStatsParams = {}) => {
  const { knowledge_type, line_type_id, system_tag_id, operation_tag_id, search } = params;

  return useQuery({
    queryKey: ['knowledge-stats', knowledge_type, line_type_id, system_tag_id, operation_tag_id, search],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (knowledge_type) searchParams.set('knowledge_type', knowledge_type);
      if (line_type_id) searchParams.set('line_type_id', String(line_type_id));
      if (system_tag_id) searchParams.set('system_tag_id', String(system_tag_id));
      if (operation_tag_id) searchParams.set('operation_tag_id', String(operation_tag_id));
      if (search) searchParams.set('search', search);

      const queryString = searchParams.toString();
      return apiClient.get<KnowledgeStats>(`/knowledge/stats${queryString ? `?${queryString}` : ''}`);
    },
  });
};

