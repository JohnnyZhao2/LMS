/**
 * Get Knowledge Categories API
 * Fetches knowledge categories for filtering
 * @module features/knowledge/api/get-knowledge-categories
 * Requirements: 5.2, 5.3 - Category filter with hierarchical selection
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { KnowledgeCategory } from '@/types/domain';
import { knowledgeKeys } from './keys';

/**
 * Fetch knowledge categories - primary categories (一级分类)
 * @returns List of primary categories
 */
export async function fetchKnowledgeCategories(): Promise<KnowledgeCategory[]> {
  return api.get<KnowledgeCategory[]>(API_ENDPOINTS.studentKnowledge.categories);
}

/**
 * Fetch secondary categories for a primary category (二级分类)
 * @param primaryId - Primary category ID
 * @returns List of secondary categories
 */
export async function fetchCategoryChildren(primaryId: number | string): Promise<KnowledgeCategory[]> {
  return api.get<KnowledgeCategory[]>(API_ENDPOINTS.studentKnowledge.categoryChildren(primaryId));
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

/**
 * Hook to fetch secondary categories for a primary category
 * Requirements: 5.3 - Dynamic loading of secondary categories
 * @param primaryId - Primary category ID
 */
export function useCategoryChildren(primaryId: number | string | undefined) {
  return useQuery({
    queryKey: knowledgeKeys.categoryChildren(primaryId!),
    queryFn: () => fetchCategoryChildren(primaryId!),
    enabled: !!primaryId,
    staleTime: 5 * 60 * 1000,
  });
}
