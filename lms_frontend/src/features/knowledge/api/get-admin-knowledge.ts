import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { KnowledgeListItem, KnowledgeDetail, KnowledgeType, KnowledgeFilterType, PaginatedResponse } from '@/types/api';

/**
 * 获取知识列表参数
 */
interface GetKnowledgeListParams {
  knowledge_type?: KnowledgeType;
  line_type_id?: number;
  system_tag_id?: number;
  operation_tag_id?: number;
  search?: string;
  /** 筛选类型：ALL/PUBLISHED_CLEAN/REVISING/UNPUBLISHED */
  filter_type?: KnowledgeFilterType;
  page?: number;
  pageSize?: number;
}

/**
 * 获取管理员知识列表
 * @param params - 筛选参数
 */
export const useAdminKnowledgeList = (params: GetKnowledgeListParams = {}) => {
  const { knowledge_type, line_type_id, system_tag_id, operation_tag_id, search, filter_type = 'ALL', page = 1, pageSize = 20 } = params;

  return useQuery({
    queryKey: ['admin-knowledge-list', knowledge_type, line_type_id, system_tag_id, operation_tag_id, search, filter_type, page, pageSize],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (knowledge_type) searchParams.set('knowledge_type', knowledge_type);
      if (line_type_id) searchParams.set('line_type_id', String(line_type_id));
      if (system_tag_id) searchParams.set('system_tag_id', String(system_tag_id));
      if (operation_tag_id) searchParams.set('operation_tag_id', String(operation_tag_id));
      if (search) searchParams.set('search', search);
      if (filter_type) searchParams.set('filter_type', filter_type);
      searchParams.set('page', String(page));
      searchParams.set('page_size', String(pageSize));

      const queryString = searchParams.toString();
      return apiClient.get<PaginatedResponse<KnowledgeListItem>>(`/knowledge/${queryString ? `?${queryString}` : ''}`);
    },
  });
};

/**
 * 获取知识详情（管理员）
 * @param id - 知识ID
 */
export const useKnowledgeDetail = (id: number) => {
  return useQuery({
    queryKey: ['admin-knowledge-detail', id],
    queryFn: () => apiClient.get<KnowledgeDetail>(`/knowledge/${id}/`),
    enabled: !!id,
  });
};
