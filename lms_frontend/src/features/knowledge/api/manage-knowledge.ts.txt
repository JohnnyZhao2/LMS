import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterKnowledgeMutation } from '@/lib/cache-invalidation';
import { queryKeys } from '@/lib/query-keys';
import type { KnowledgeDetail, KnowledgeCreateRequest, KnowledgeUpdateRequest } from '@/types/knowledge';

/**
 * 创建知识文档
 */
export const useCreateKnowledge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: KnowledgeCreateRequest) => 
      apiClient.post<KnowledgeDetail>('/knowledge/', data),
    onSuccess: () => invalidateAfterKnowledgeMutation(queryClient),
  });
};

/**
 * 更新知识文档
 */
export const useUpdateKnowledge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: KnowledgeUpdateRequest }) =>
      apiClient.patch<KnowledgeDetail>(`/knowledge/${id}/`, data),
    onSuccess: (updatedKnowledge) => {
      queryClient.setQueriesData<KnowledgeDetail>(
        { queryKey: queryKeys.knowledge.detailRoot() },
        (cachedKnowledge) => {
          if (!cachedKnowledge) return cachedKnowledge;
          if (cachedKnowledge.id !== updatedKnowledge.id) return cachedKnowledge;
          return {
            ...cachedKnowledge,
            ...updatedKnowledge,
          };
        },
      );
      return invalidateAfterKnowledgeMutation(queryClient);
    },
  });
};

/**
 * 删除知识文档
 */
export const useDeleteKnowledge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/knowledge/${id}/`),
    onSuccess: () => invalidateAfterKnowledgeMutation(queryClient),
  });
};
