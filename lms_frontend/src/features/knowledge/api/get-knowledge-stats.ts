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
  space_tag_id?: number;
  tag_id?: number;
  search?: string;
}

/**
 * 获取知识统计数据
 * @param params - 筛选参数
 */
export const useKnowledgeStats = (params: GetKnowledgeStatsParams = {}) => {
  const currentRole = useCurrentRole();
  const { space_tag_id, tag_id, search } = params;

  return useQuery({
    queryKey: [
      'knowledge-stats',
      currentRole ?? 'UNKNOWN',
      space_tag_id,
      tag_id,
      search,
    ],
    queryFn: () => {
      const queryParams = {
        ...(space_tag_id && { space_tag_id: String(space_tag_id) }),
        ...(tag_id && { tag_id: String(tag_id) }),
        ...(search && { search }),
      };
      const queryString = buildQueryString(queryParams);
      return apiClient.get<KnowledgeStats>(`/knowledge/stats${queryString}`);
    },
    enabled: currentRole !== null,
  });
};
