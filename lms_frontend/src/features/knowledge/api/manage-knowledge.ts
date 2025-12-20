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
      queryClient.invalidateQueries({ queryKey: ['tags'] });
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['student-knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-knowledge-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['student-knowledge-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
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
    },
  });
};

/**
 * 发布知识文档
 */
export const usePublishKnowledge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.post<KnowledgeDetail>(`/knowledge/${id}/publish/`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin-knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['student-knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-knowledge-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['student-knowledge-detail', id] });
    },
  });
};

/**
 * 取消发布知识文档
 */
export const useUnpublishKnowledge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.post<KnowledgeDetail>(`/knowledge/${id}/unpublish/`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['admin-knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['student-knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-knowledge-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['student-knowledge-detail', id] });
    },
  });
};

