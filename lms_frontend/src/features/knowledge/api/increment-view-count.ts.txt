import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterKnowledgeViewMutation } from '@/lib/cache-invalidation';
import { queryKeys } from '@/lib/query-keys';
import type { KnowledgeDetail } from '@/types/knowledge';

/**
 * 增加知识阅读次数响应
 */
interface IncrementViewCountResponse {
  view_count: number;
}

/**
 * 增加知识阅读次数
 * 
 * 当学员查看知识详情时调用此接口记录阅读次数
 * @param id - 知识ID
 */
export const useIncrementViewCount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.post<IncrementViewCountResponse>(`/knowledge/${id}/view/`);
      return { id, view_count: response.view_count };
    },
    onSuccess: (result) => {
      queryClient.setQueriesData<KnowledgeDetail>(
        { queryKey: queryKeys.knowledge.detailRoot() },
        (old) => {
          if (!old || old.id !== result.id) {
            return old;
          }
          return { ...old, view_count: result.view_count };
        },
      );
      return invalidateAfterKnowledgeViewMutation(queryClient);
    },
  });
};
