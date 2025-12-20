import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

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
      return apiClient.post<IncrementViewCountResponse>(`/knowledge/${id}/view/`);
    },
    onSuccess: (data, id) => {
      // 更新知识详情和列表中的阅读次数
      queryClient.setQueryData(['student-knowledge-detail', id], (old: any) => {
        if (old) {
          return { ...old, view_count: data.view_count };
        }
        return old;
      });
      queryClient.setQueryData(['admin-knowledge-detail', id], (old: any) => {
        if (old) {
          return { ...old, view_count: data.view_count };
        }
        return old;
      });
      // 更新列表中的阅读次数（需要遍历所有相关查询）
      queryClient.invalidateQueries({ queryKey: ['student-knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-knowledge-list'] });
    },
  });
};

