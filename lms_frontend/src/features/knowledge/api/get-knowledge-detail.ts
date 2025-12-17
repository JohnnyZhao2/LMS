/**
 * Get Knowledge Detail API
 * Fetches single knowledge document detail
 * @module features/knowledge/api/get-knowledge-detail
 * Requirements: 5.6, 5.7 - Display knowledge detail based on type
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Knowledge } from '@/types/domain';
import { knowledgeKeys } from './keys';

/**
 * Fetch single knowledge detail (学员知识中心)
 * @param id - Knowledge document ID
 * @returns Knowledge document detail
 */
export async function fetchKnowledgeDetail(id: number | string): Promise<Knowledge> {
  return api.get<Knowledge>(API_ENDPOINTS.studentKnowledge.detail(id));
}

/**
 * Hook to fetch knowledge detail
 * Requirements: 5.6, 5.7 - Display knowledge detail based on type
 * @param id - Knowledge document ID
 */
export function useKnowledgeDetail(id: number | string | undefined) {
  return useQuery({
    queryKey: knowledgeKeys.detail(id!),
    queryFn: () => fetchKnowledgeDetail(id!),
    enabled: !!id,
  });
}
