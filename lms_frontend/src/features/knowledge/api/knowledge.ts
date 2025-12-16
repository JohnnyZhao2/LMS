/**
 * Knowledge API
 * API functions for knowledge center operations
 * Requirements: 5.1 - Knowledge list and detail access
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Knowledge, KnowledgeCategory } from '@/types/domain';
import type { PaginatedResponse, KnowledgeFilterParams } from '@/types/api';

// Query keys for React Query
export const knowledgeKeys = {
  all: ['knowledge'] as const,
  lists: () => [...knowledgeKeys.all, 'list'] as const,
  list: (params: KnowledgeFilterParams) => [...knowledgeKeys.lists(), params] as const,
  details: () => [...knowledgeKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...knowledgeKeys.details(), id] as const,
  categories: () => [...knowledgeKeys.all, 'categories'] as const,
};

/**
 * Fetch knowledge list with optional filters
 */
export async function fetchKnowledgeList(
  params: KnowledgeFilterParams = {}
): Promise<PaginatedResponse<Knowledge>> {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  if (params.search) searchParams.set('search', params.search);
  if (params.ordering) searchParams.set('ordering', params.ordering);
  if (params.primary_category) searchParams.set('primary_category', String(params.primary_category));
  if (params.secondary_category) searchParams.set('secondary_category', String(params.secondary_category));
  if (params.knowledge_type) searchParams.set('knowledge_type', params.knowledge_type);
  
  const queryString = searchParams.toString();
  const url = queryString 
    ? `${API_ENDPOINTS.knowledge.list}?${queryString}` 
    : API_ENDPOINTS.knowledge.list;
  
  return api.get<PaginatedResponse<Knowledge>>(url);
}

/**
 * Fetch single knowledge detail
 */
export async function fetchKnowledgeDetail(id: number | string): Promise<Knowledge> {
  return api.get<Knowledge>(API_ENDPOINTS.knowledge.detail(id));
}

/**
 * Fetch knowledge categories (hierarchical)
 */
export async function fetchKnowledgeCategories(): Promise<KnowledgeCategory[]> {
  return api.get<KnowledgeCategory[]>(API_ENDPOINTS.knowledge.categories);
}

/**
 * Hook to fetch knowledge list
 * Requirements: 5.1 - Display knowledge document card list
 */
export function useKnowledgeList(params: KnowledgeFilterParams = {}) {
  return useQuery({
    queryKey: knowledgeKeys.list(params),
    queryFn: () => fetchKnowledgeList(params),
  });
}

/**
 * Hook to fetch knowledge detail
 * Requirements: 5.6, 5.7 - Display knowledge detail based on type
 */
export function useKnowledgeDetail(id: number | string | undefined) {
  return useQuery({
    queryKey: knowledgeKeys.detail(id!),
    queryFn: () => fetchKnowledgeDetail(id!),
    enabled: !!id,
  });
}

/**
 * Hook to fetch knowledge categories
 * Requirements: 5.2, 5.3 - Category filter with hierarchical selection
 */
export function useKnowledgeCategories() {
  return useQuery({
    queryKey: knowledgeKeys.categories(),
    queryFn: fetchKnowledgeCategories,
    staleTime: 5 * 60 * 1000, // Categories don't change often, cache for 5 minutes
  });
}
