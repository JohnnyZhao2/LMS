/**
 * Get Knowledge Heat API
 * Fetches knowledge heat data for team manager
 * @module features/team/api/get-knowledge-heat
 * Requirements: 20.3
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { KnowledgeHeatResponse } from './types';

/**
 * Fetch knowledge heat data
 * Requirements: 20.3
 * @returns Knowledge heat data
 */
export async function fetchKnowledgeHeat(): Promise<KnowledgeHeatResponse> {
  return api.get<KnowledgeHeatResponse>(API_ENDPOINTS.analytics.knowledgeHeat);
}

/**
 * Hook to fetch knowledge heat data
 * Requirements: 20.3
 */
export function useKnowledgeHeat() {
  return useQuery({
    queryKey: ['team', 'knowledge-heat'],
    queryFn: fetchKnowledgeHeat,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
