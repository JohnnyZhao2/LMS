/**
 * Get Score History API
 * Fetches score history for practice and exams
 * @module features/analytics/api/get-score-history
 * Requirements: 10.2 - Display practice and exam score records
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { ScoreHistoryParams, ScoreHistoryResponse } from './types';
import { personalKeys } from './keys';

/**
 * Fetch score history
 * Requirements: 10.2 - Display practice and exam score records
 * @param params - Filter parameters
 * @returns Score history data
 */
export async function fetchScoreHistory(
  params?: ScoreHistoryParams
): Promise<ScoreHistoryResponse> {
  const searchParams = new URLSearchParams();
  
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.page_size) searchParams.set('page_size', String(params.page_size));
  if (params?.type) searchParams.set('task_type', params.type);
  
  const queryString = searchParams.toString();
  const url = queryString
    ? `${API_ENDPOINTS.personalCenter.scores}?${queryString}`
    : API_ENDPOINTS.personalCenter.scores;
    
  return api.get<ScoreHistoryResponse>(url);
}

/**
 * Hook to fetch score history
 * @param params - Filter parameters
 */
export function useScoreHistory(params?: ScoreHistoryParams) {
  return useQuery({
    queryKey: personalKeys.scores(params),
    queryFn: () => fetchScoreHistory(params),
  });
}
