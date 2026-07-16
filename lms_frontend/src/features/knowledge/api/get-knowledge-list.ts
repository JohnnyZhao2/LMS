import { useInfiniteQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { buildPaginationParams, buildQueryString } from '@/lib/api-utils';
import { queryKeys } from '@/lib/query-keys';
import type { PaginatedResponse } from '@/types/common';
import type { KnowledgeListItem } from '@/types/knowledge';

interface GetKnowledgeListParams {
  space_tag_id?: number;
  tag_id?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const getKnowledgeList = (
  { space_tag_id, tag_id, search, pageSize = 20 }: GetKnowledgeListParams = {},
  page = 1,
) =>
  apiClient.get<PaginatedResponse<KnowledgeListItem>>(
    `/knowledge${buildQueryString({
      ...buildPaginationParams(page, pageSize),
      ...(space_tag_id && { space_tag_id: String(space_tag_id) }),
      ...(tag_id && { tag_id: String(tag_id) }),
      ...(search && { search }),
    })}`,
  );

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
    queryFn: ({ pageParam }) => getKnowledgeList(params, Number(pageParam)),
    getNextPageParam: (lastPage) =>
      lastPage.current_page < lastPage.total_pages ? lastPage.current_page + 1 : undefined,
    enabled: currentRole !== null,
  });
};
