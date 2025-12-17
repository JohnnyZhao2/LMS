/**
 * Get Admin Knowledge List API
 * Fetches knowledge list for admin management
 * @module features/knowledge/api/get-admin-knowledge-list
 * Requirements: 17.1 - Display knowledge list with search and filter
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Knowledge } from '@/types/domain';
import type { PaginatedResponse, KnowledgeFilterParams } from '@/types/api';
import { knowledgeKeys } from './keys';

/**
 * Fetch knowledge list for admin management (uses admin endpoint)
 * Requirements: 17.1 - Display knowledge list with search and filter
 * @param params - Filter parameters
 * @returns Paginated knowledge list
 */
export async function fetchAdminKnowledgeList(
  params: KnowledgeFilterParams = {}
): Promise<PaginatedResponse<Knowledge>> {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  if (params.search) searchParams.set('search', params.search);
  if (params.ordering) searchParams.set('ordering', params.ordering);
  if (params.primary_category) searchParams.set('primary_category_id', String(params.primary_category));
  if (params.secondary_category) searchParams.set('secondary_category_id', String(params.secondary_category));
  if (params.knowledge_type) searchParams.set('knowledge_type', params.knowledge_type);
  
  const queryString = searchParams.toString();
  const url = queryString 
    ? `${API_ENDPOINTS.knowledge.list}?${queryString}` 
    : API_ENDPOINTS.knowledge.list;
  
  return api.get<PaginatedResponse<Knowledge>>(url);
}

/**
 * Hook to fetch admin knowledge list
 * Requirements: 17.1 - Display knowledge list
 * @param params - Filter parameters
 */
export function useAdminKnowledgeList(params: KnowledgeFilterParams = {}) {
  return useQuery({
    queryKey: [...knowledgeKeys.lists(), 'admin', params],
    queryFn: () => fetchAdminKnowledgeList(params),
  });
}
