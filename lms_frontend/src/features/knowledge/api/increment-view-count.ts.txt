import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { KnowledgeDetail, StudentKnowledgeDetail } from '@/types/knowledge';

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
    onSuccess: (result, id) => {
      // 更新知识详情中的阅读次数
      queryClient.setQueryData(['student-knowledge-detail', id], (old: StudentKnowledgeDetail | undefined) => {
        if (old) {
          return { ...old, view_count: result.view_count };
        }
        return old;
      });
      queryClient.setQueryData(['admin-knowledge-detail', id], (old: KnowledgeDetail | undefined) => {
        if (old) {
          return { ...old, view_count: result.view_count };
        }
        return old;
      });
      // 更新列表中的阅读次数
      queryClient.invalidateQueries({ queryKey: ['student-knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-knowledge-list'] });
    },
  });
};
