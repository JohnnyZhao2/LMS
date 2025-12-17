/**
 * Get Quiz API
 * Fetches single quiz by ID
 * @module features/test-center/api/quizzes/get-quiz
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Quiz } from '@/types/domain';
import { quizKeys } from './keys';

/**
 * Fetch single quiz by ID
 * @param id - Quiz ID
 * @returns Quiz detail
 */
export async function fetchQuiz(id: number): Promise<Quiz> {
  return api.get<Quiz>(API_ENDPOINTS.quizzes.detail(id));
}

/**
 * Hook to fetch a single quiz by ID
 * @param id - Quiz ID
 */
export function useQuiz(id: number) {
  return useQuery({
    queryKey: quizKeys.detail(id),
    queryFn: () => fetchQuiz(id),
    enabled: !!id,
  });
}
