/**
 * Get Question API
 * Fetches single question by ID
 * @module features/test-center/api/questions/get-question
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Question } from '@/types/domain';
import { questionKeys } from './keys';

/**
 * Fetch single question by ID
 * @param id - Question ID
 * @returns Question detail
 */
export async function fetchQuestion(id: number): Promise<Question> {
  return api.get<Question>(API_ENDPOINTS.questions.detail(id));
}

/**
 * Hook to fetch a single question by ID
 * @param id - Question ID
 */
export function useQuestion(id: number) {
  return useQuery({
    queryKey: questionKeys.detail(id),
    queryFn: () => fetchQuestion(id),
    enabled: !!id,
  });
}
