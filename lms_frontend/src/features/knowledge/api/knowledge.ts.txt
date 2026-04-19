import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString, buildPaginationParams } from '@/lib/api-utils';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentRole } from '@/session/hooks/use-current-role';
import type { PaginatedResponse } from '@/types/common';
import type { KnowledgeListItem, KnowledgeDetail } from '@/types/knowledge';

interface GetKnowledgeListParams {
  space_tag_id?: number;
  tag_id?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const useInfiniteKnowledgeList = (params: GetKnowledgeListParams = {}) => {
  const currentRole = useCurrentRole();
  const { space_tag_id, tag_id, search, pageSize = 20 } = params;

  return useInfiniteQuery({
    queryKey: queryKeys.knowledge.infiniteList({
      currentRole,
      spaceTagId: space_tag_id,
      tagId: tag_id,
      search,
      pageSize,
    }),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const page = Number(pageParam) || 1;
      const queryParams = {
        ...buildPaginationParams(page, pageSize),
        ...(space_tag_id && { space_tag_id: String(space_tag_id) }),
        ...(tag_id && { tag_id: String(tag_id) }),
        ...(search && { search }),
      };
      const queryString = buildQueryString(queryParams);
      return apiClient.get<PaginatedResponse<KnowledgeListItem>>(`/knowledge${queryString}`);
    },
    getNextPageParam: (lastPage) => (
      lastPage.current_page < lastPage.total_pages
        ? lastPage.current_page + 1
        : undefined
    ),
    enabled: currentRole !== null,
  });
};

interface UseKnowledgeDetailParams {
  knowledgeId?: number;
  taskKnowledgeId?: number;
}

export const useKnowledgeDetail = ({ knowledgeId, taskKnowledgeId }: UseKnowledgeDetailParams) => {
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
