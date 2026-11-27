import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { invalidateAfterTagMutation } from '@/lib/cache-invalidation';
import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/lib/auth';
import type { Tag, TagType } from '@/types/common';

interface GetTagsParams {
  tag_type?: TagType;
  search?: string;
  limit?: number;
  applicable_to?: 'knowledge' | 'question';
  space_tag_id?: number;
  enabled?: boolean;
}

interface TagMutationPayload {
  name: string;
  tag_type: TagType;
  color?: string;
  sort_order?: number;
  allow_knowledge?: boolean;
  allow_question?: boolean;
  current_module?: 'knowledge' | 'question';
  extend_scope?: boolean;
}

interface MergeTagPayload {
  source_tag_ids: number[];
  merged_name: string;
}

interface ReorderSpaceTagsPayload {
  ordered_tag_ids: number[];
}

export const useTags = (params: GetTagsParams = {}) => {
  const { hasCapability, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { tag_type, search, limit, applicable_to, space_tag_id, enabled = true } = params;
  const canQueryTags = hasCapability('tags.view_tag')
    || (isAuthenticated && (tag_type === 'SPACE' || applicable_to === 'knowledge'));

  return useQuery({
    queryKey: queryKeys.tags.list({
      canQueryTags,
      tagType: tag_type,
      search,
      limit,
      applicableTo: applicable_to,
      spaceTagId: space_tag_id,
    }),
    queryFn: () => {
      const queryString = buildQueryString({
        tag_type,
        search,
        limit,
        applicable_to,
        space_tag_id,
      });
      return apiClient.get<Tag[]>(`/tags/${queryString}`);
    },
    staleTime: 2 * 60 * 1000,
    enabled: enabled && !isAuthLoading && canQueryTags,
  });
};

export const useCreateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TagMutationPayload) => apiClient.post<Tag>('/tags/', data),
    onSuccess: () => invalidateAfterTagMutation(queryClient),
  });
};

export const useUpdateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TagMutationPayload> }) =>
      apiClient.patch<Tag>(`/tags/${id}/`, data),
    onSuccess: () => invalidateAfterTagMutation(queryClient),
  });
};

export const useMergeTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MergeTagPayload) =>
      apiClient.post<Tag>('/tags/merge/', data),
    onSuccess: () => invalidateAfterTagMutation(queryClient),
  });
};

export const useDeleteTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/tags/${id}/`),
    onSuccess: () => invalidateAfterTagMutation(queryClient),
  });
};

export const useReorderSpaceTags = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ReorderSpaceTagsPayload) =>
      apiClient.post('/tags/reorder/', data),
    onSuccess: () => invalidateAfterTagMutation(queryClient),
  });
};
