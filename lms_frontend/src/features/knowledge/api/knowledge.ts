import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString, buildPaginationParams } from '@/lib/api-utils';
import {
  invalidateAfterKnowledgeBulkImport,
  invalidateAfterKnowledgeMutation,
  invalidateAfterKnowledgeUpdate,
  invalidateAfterKnowledgeViewMutation,
} from '@/lib/cache-invalidation';
import { queryKeys } from '@/lib/query-keys';
import type { PaginatedResponse } from '@/types/common';
import type {
  KnowledgeDetail,
  KnowledgeExtraField,
  KnowledgeListItem,
  KnowledgeWriteRequest,
  RelatedLink,
} from '@/types/knowledge';

type KnowledgeListPage = PaginatedResponse<KnowledgeListItem> & {
  total_knowledge_count?: number;
};

interface GetKnowledgeListParams {
  space_tag_id?: number;
  tag_ids?: number[];
  search?: string;
  pageSize?: number;
  groupByDoc?: boolean;
}

export const useInfiniteKnowledgeList = (params: GetKnowledgeListParams = {}) => {
  const { space_tag_id, tag_ids, search, pageSize = 24, groupByDoc = true } = params;
  const normalizedTagIds = tag_ids && tag_ids.length > 0 ? [...tag_ids].sort((a, b) => a - b) : undefined;

  return useInfiniteQuery({
    queryKey: queryKeys.knowledge.infiniteList({
      spaceTagId: space_tag_id,
      tagIds: normalizedTagIds,
      search,
      pageSize,
      groupByDoc,
    }),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const page = Number(pageParam) || 1;
      const queryParams = {
        ...buildPaginationParams(page, pageSize),
        ...(space_tag_id && { space_tag_id: String(space_tag_id) }),
        ...(normalizedTagIds && { tag_ids: normalizedTagIds.join(',') }),
        ...(search && { search }),
        ...(groupByDoc && { group_by_doc: 'true' }),
      };
      return apiClient.get<KnowledgeListPage>(
        `/knowledge${buildQueryString(queryParams)}`,
      );
    },
    getNextPageParam: (lastPage) => (
      lastPage.current_page < lastPage.total_pages
        ? lastPage.current_page + 1
        : undefined
    ),
    enabled: true,
  });
};

export const usePinnedKnowledgeList = () =>
  useQuery({
    queryKey: queryKeys.knowledge.pinnedList(),
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<KnowledgeListItem>>(
        `/knowledge${buildQueryString({ pinned: 'true', page: '1', page_size: '50' })}`,
      );
      return res.results;
    },
  });

export const useKnowledgeDetail = ({
  knowledgeId,
  taskKnowledgeId,
}: {
  knowledgeId?: number;
  taskKnowledgeId?: number;
}) => {
  const detailId = taskKnowledgeId ?? knowledgeId ?? 0;

  return useQuery({
    queryKey: queryKeys.knowledge.detail({
      knowledgeId,
      taskKnowledgeId,
    }),
    queryFn: () => (
      taskKnowledgeId
        ? apiClient.get<KnowledgeDetail>(`/knowledge/task/${taskKnowledgeId}/`)
        : apiClient.get<KnowledgeDetail>(`/knowledge/${knowledgeId}/`)
    ),
    enabled: !!detailId,
    placeholderData: keepPreviousData,
  });
};

type BulkRowFailure = { row_number: number; reason: string };

export type KnowledgeBulkImportTagItem = {
  name: string;
  category?: string;
};

export type KnowledgeBulkImportItem = {
  row_number: number;
  id?: number;
  title: string;
  section?: string;
  summary?: string;
  content: string;
  extra_fields?: KnowledgeExtraField[];
  external_doc_url: string;
  space_name: string;
  tag_names: string[];
  tag_items?: KnowledgeBulkImportTagItem[];
  related_links: RelatedLink[];
};
export type KnowledgeBulkImportResult = {
  created: number;
  updated: number;
  unchanged: number;
  failures: BulkRowFailure[];
};

export type KnowledgeBulkUpdateRequest = {
  ids: number[];
  update_space?: boolean;
  space_tag_id?: number | null;
  add_tag_ids?: number[];
};
export type KnowledgeBulkUpdateResult = { updated: number };
export type KnowledgeBulkDeleteItem = {
  row_number: number;
  id?: number;
  external_doc_url: string;
  title: string;
  section?: string;
};
export type KnowledgeBulkDeleteRequest =
  | { ids: number[] }
  | { items: KnowledgeBulkDeleteItem[] };
export type KnowledgeBulkDeleteResult = {
  deleted: number;
  failures: BulkRowFailure[];
};

function useKnowledgeItemsMutation<TItem, TResult>(
  path: string,
  invalidate = invalidateAfterKnowledgeMutation,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: TItem[]) => apiClient.post<TResult>(path, { items }),
    onSuccess: () => invalidate(queryClient),
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
  useKnowledgeItemsMutation<KnowledgeBulkImportItem, KnowledgeBulkImportResult>(
    '/knowledge/import/',
    invalidateAfterKnowledgeBulkImport,
  );

export const useBulkUpdateKnowledge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: KnowledgeBulkUpdateRequest) =>
      apiClient.post<KnowledgeBulkUpdateResult>('/knowledge/bulk-update/', data),
    onSuccess: () => invalidateAfterKnowledgeMutation(queryClient),
  });
};

export const useBulkDeleteKnowledge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: KnowledgeBulkDeleteRequest) =>
      apiClient.post<KnowledgeBulkDeleteResult>('/knowledge/bulk-delete/', payload),
    onSuccess: () => invalidateAfterKnowledgeMutation(queryClient),
  });
};

export const useUpdateKnowledge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: KnowledgeWriteRequest }) =>
      apiClient.patch<KnowledgeDetail>(`/knowledge/${id}/`, data),
    onSuccess: (updatedKnowledge) => {
      queryClient.setQueryData(
        queryKeys.knowledge.detail({ knowledgeId: updatedKnowledge.id }),
        updatedKnowledge,
      );
      return invalidateAfterKnowledgeUpdate(queryClient);
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
      queryClient.setQueryData<KnowledgeDetail>(
        queryKeys.knowledge.detail({ knowledgeId: result.id }),
        (old) => (old ? { ...old, view_count: result.view_count } : old),
      );
      return invalidateAfterKnowledgeViewMutation(queryClient);
    },
  });
};
