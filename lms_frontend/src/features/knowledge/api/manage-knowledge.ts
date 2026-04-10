import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { KnowledgeDetail, KnowledgeCreateRequest, KnowledgeUpdateRequest } from '@/types/api';

/**
 * 创建知识文档
 */
export const useCreateKnowledge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: KnowledgeCreateRequest) => 
      apiClient.post<KnowledgeDetail>('/knowledge/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['student-knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['task-resource-options'] });
    },
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
        { queryKey: ['knowledge-detail'] },
        (cachedKnowledge) => {
          if (!cachedKnowledge) return cachedKnowledge;
          if (cachedKnowledge.id !== updatedKnowledge.id) return cachedKnowledge;
          return {
            ...cachedKnowledge,
            ...updatedKnowledge,
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: ['admin-knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['student-knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['task-resource-options'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-detail'] });
      queryClient.invalidateQueries({ queryKey: ['admin-knowledge-detail'] });
      queryClient.invalidateQueries({ queryKey: ['student-knowledge-detail'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['student-knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['task-resource-options'] });
    },
  });
};
