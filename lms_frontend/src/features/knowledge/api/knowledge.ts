import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString, buildPaginationParams } from '@/lib/api-utils';
import {
  invalidateAfterKnowledgeMutation,
  invalidateAfterKnowledgeViewMutation,
} from '@/lib/cache-invalidation';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentRole } from '@/session/hooks/use-current-role';
import type { PaginatedResponse } from '@/types/common';
import type { KnowledgeListItem, KnowledgeDetail, KnowledgeWriteRequest } from '@/types/knowledge';

interface GetKnowledgeListParams {
  space_tag_id?: number;
  search?: string;
  pageSize?: number;
}

export const useInfiniteKnowledgeList = (params: GetKnowledgeListParams = {}) => {
  const currentRole = useCurrentRole();
  const { space_tag_id, search, pageSize = 20 } = params;

  return useInfiniteQuery({
    queryKey: queryKeys.knowledge.infiniteList({
      currentRole,
      spaceTagId: space_tag_id,
      search,
      pageSize,
    }),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const page = Number(pageParam) || 1;
      const queryParams = {
        ...buildPaginationParams(page, pageSize),
        ...(space_tag_id && { space_tag_id: String(space_tag_id) }),
        ...(search && { search }),
      };
      return apiClient.get<PaginatedResponse<KnowledgeListItem>>(
        `/knowledge${buildQueryString(queryParams)}`,
      );
    },
    getNextPageParam: (lastPage) => (
      lastPage.current_page < lastPage.total_pages
        ? lastPage.current_page + 1
        : undefined
    ),
    enabled: currentRole !== null,
  });
};

export const useKnowledgeDetail = ({
  knowledgeId,
  taskKnowledgeId,
}: {
  knowledgeId?: number;
  taskKnowledgeId?: number;
}) => {
  const currentRole = useCurrentRole();
  const detailId = taskKnowledgeId ?? knowledgeId ?? 0;

  return useQuery({
    queryKey: queryKeys.knowledge.detail({
      currentRole,
      knowledgeId,
      taskKnowledgeId,
    }),
    queryFn: () => (
      taskKnowledgeId
        ? apiClient.get<KnowledgeDetail>(`/knowledge/task/${taskKnowledgeId}/`)
        : apiClient.get<KnowledgeDetail>(`/knowledge/${knowledgeId}/`)
    ),
    enabled: !!detailId && currentRole !== null,
  });
};

type BulkRowFailure = { row_number: number; reason: string };

export type KnowledgeBulkImportItem = KnowledgeWriteRequest & { row_number: number };
export type KnowledgeBulkImportResult = {
  created: number;
  updated: number;
  unchanged: number;
  failures: BulkRowFailure[];
};

export type KnowledgeBulkDeleteItem = {
  row_number: number;
  external_doc_url: string;
  title?: string;
};
export type KnowledgeBulkDeleteResult = {
  deleted: number;
  failures: BulkRowFailure[];
};

function useKnowledgeItemsMutation<TItem, TResult>(path: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: TItem[]) => apiClient.post<TResult>(path, { items }),
    onSuccess: () => invalidateAfterKnowledgeMutation(queryClient),
  });
}

export const useCreateKnowledge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: KnowledgeWriteRequest) =>
      apiClient.post<KnowledgeDetail>('/knowledge/', data),
    onSuccess: () => invalidateAfterKnowledgeMutation(queryClient),
  });
};

export const useBulkImportKnowledge = () =>
  useKnowledgeItemsMutation<KnowledgeBulkImportItem, KnowledgeBulkImportResult>('/knowledge/import/');

export const useBulkDeleteKnowledge = () =>
  useKnowledgeItemsMutation<KnowledgeBulkDeleteItem, KnowledgeBulkDeleteResult>('/knowledge/bulk-delete/');

export const useUpdateKnowledge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: KnowledgeWriteRequest }) =>
      apiClient.patch<KnowledgeDetail>(`/knowledge/${id}/`, data),
    onSuccess: (updatedKnowledge) => {
      queryClient.setQueriesData<KnowledgeDetail>(
        { queryKey: queryKeys.knowledge.detailRoot() },
        (cached) => (
          cached?.id === updatedKnowledge.id
            ? { ...cached, ...updatedKnowledge }
            : cached
        ),
      );
      return invalidateAfterKnowledgeMutation(queryClient);
    },
  });
};

export const useDeleteKnowledge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/knowledge/${id}/`),
    onSuccess: () => invalidateAfterKnowledgeMutation(queryClient),
  });
};

export const useIncrementViewCount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.post<{ view_count: number }>(`/knowledge/${id}/view/`);
      return { id, view_count: response.view_count };
    },
    onSuccess: (result) => {
      queryClient.setQueriesData<KnowledgeDetail>(
        { queryKey: queryKeys.knowledge.detailRoot() },
        (old) => (old?.id === result.id ? { ...old, view_count: result.view_count } : old),
      );
      return invalidateAfterKnowledgeViewMutation(queryClient);
    },
  });
};
