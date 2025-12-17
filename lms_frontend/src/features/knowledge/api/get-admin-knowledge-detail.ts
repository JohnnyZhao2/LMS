/**
 * Get Admin Knowledge Detail API
 * Fetches single knowledge document detail for admin
 * @module features/knowledge/api/get-admin-knowledge-detail
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Knowledge } from '@/types/domain';
import { knowledgeKeys } from './keys';

/**
 * Fetch single knowledge detail for admin
 * @param id - Knowledge document ID
 * @returns Knowledge document detail
 */
export async function fetchAdminKnowledgeDetail(id: number | string): Promise<Knowledge> {
  return api.get<Knowledge>(API_ENDPOINTS.knowledge.detail(id));
}

/**
 * Hook to fetch admin knowledge detail
 * @param id - Knowledge document ID
 */
export function useAdminKnowledgeDetail(id: number | string | undefined) {
  return useQuery({
    queryKey: [...knowledgeKeys.details(), 'admin', id],
    queryFn: () => fetchAdminKnowledgeDetail(id!),
    enabled: !!id,
  });
}
