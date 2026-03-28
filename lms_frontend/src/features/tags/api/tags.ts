import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { Tag, TagType } from '@/types/api';

interface GetTagsParams {
  tag_type?: TagType;
  search?: string;
  limit?: number;
  active_only?: boolean;
  applicable_to?: 'knowledge' | 'question';
}

export interface TagMutationPayload {
  name: string;
  tag_type: TagType;
  color?: string;
  sort_order?: number;
  is_active?: boolean;
  allow_knowledge?: boolean;
  allow_question?: boolean;
  current_module?: 'knowledge' | 'question';
  extend_scope?: boolean;
}

export const useTags = (params: GetTagsParams = {}) => {
  const currentRole = useCurrentRole();
  const { tag_type, search, limit = 50, active_only = true, applicable_to } = params;

  return useQuery({
    queryKey: ['tags', currentRole ?? 'UNKNOWN', tag_type, search, limit, active_only, applicable_to],
    queryFn: () => {
      const queryString = buildQueryString({
        tag_type,
        search,
        limit,
        active_only,
        applicable_to,
      });
      return apiClient.get<Tag[]>(`/tags/${queryString}`);
    },
    staleTime: 2 * 60 * 1000,
    enabled: currentRole !== null,
  });
};

export const useCreateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TagMutationPayload) => apiClient.post<Tag>('/tags/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['question-detail'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-detail'] });
    },
  });
};

export const useUpdateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TagMutationPayload> }) =>
      apiClient.patch<Tag>(`/tags/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['question-detail'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-detail'] });
    },
  });
};

export const useDeleteTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/tags/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['question-detail'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['knowledge-detail'] });
      queryClient.invalidateQueries({ queryKey: ['admin-knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['student-knowledge-list'] });
      queryClient.invalidateQueries({ queryKey: ['task-knowledge-options'] });
    },
  });
};

