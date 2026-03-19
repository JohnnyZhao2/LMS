import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';
import { useCurrentRole } from '@/hooks/use-current-role';

/**
 * 知识统计数据
 */
export interface KnowledgeStats {
  total: number;
  published: number;
  monthly_new: number;
  with_content: number;
}

/**
 * 获取知识统计参数
 */
interface GetKnowledgeStatsParams {
  line_tag_id?: number;
  system_tag_id?: number;
  operation_tag_id?: number;
  search?: string;
}

/**
 * 获取知识统计数据
 * @param params - 筛选参数
 */
export const useKnowledgeStats = (params: GetKnowledgeStatsParams = {}) => {
  const currentRole = useCurrentRole();
  const { line_tag_id, system_tag_id, operation_tag_id, search } = params;

  return useQuery({
    queryKey: [
      'knowledge-stats',
      currentRole ?? 'UNKNOWN',
      line_tag_id,
      system_tag_id,
      operation_tag_id,
      search,
    ],
    queryFn: () => {
      const queryParams = {
        ...(line_tag_id && { line_tag_id: String(line_tag_id) }),
        ...(system_tag_id && { system_tag_id: String(system_tag_id) }),
        ...(operation_tag_id && { operation_tag_id: String(operation_tag_id) }),
        ...(search && { search }),
      };
      const queryString = buildQueryString(queryParams);
      return apiClient.get<KnowledgeStats>(`/knowledge/stats${queryString}`);
    },
    enabled: currentRole !== null,
  });
};
