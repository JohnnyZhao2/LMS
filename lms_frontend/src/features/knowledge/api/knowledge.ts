import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString, buildPaginationParams } from '@/lib/api-utils';
import type { KnowledgeListItem, KnowledgeDetail, KnowledgeType, PaginatedResponse } from '@/types/api';

interface GetKnowledgeListParams {
  knowledge_type?: KnowledgeType;
  line_type_id?: number;
  system_tag_id?: number;
  operation_tag_id?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

export const useKnowledgeList = (params: GetKnowledgeListParams = {}) => {
  const { knowledge_type, line_type_id, system_tag_id, operation_tag_id, search, page = 1, pageSize = 20 } = params;

  return useQuery({
    queryKey: ['knowledge-list', knowledge_type, line_type_id, system_tag_id, operation_tag_id, search, page, pageSize],
    queryFn: () => {
      const queryParams = {
        ...buildPaginationParams(page, pageSize),
        ...(knowledge_type && { knowledge_type }),
        ...(line_type_id && { line_type_id: String(line_type_id) }),
        ...(system_tag_id && { system_tag_id: String(system_tag_id) }),
        ...(operation_tag_id && { operation_tag_id: String(operation_tag_id) }),
        ...(search && { search }),
      };
      const queryString = buildQueryString(queryParams);
      return apiClient.get<PaginatedResponse<KnowledgeListItem>>(`/knowledge${queryString}`);
    },
  });
};

export const useKnowledgeDetail = (id: number) => {
  return useQuery({
    queryKey: ['knowledge-detail', id],
    queryFn: () => apiClient.get<KnowledgeDetail>(`/knowledge/${id}/`),
    enabled: !!id,
  });
};
