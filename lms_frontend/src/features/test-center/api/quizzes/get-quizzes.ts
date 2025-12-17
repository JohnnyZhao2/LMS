/**
 * Get Quizzes API
 * Fetches quizzes list with pagination and search
 * @module features/test-center/api/quizzes/get-quizzes
 * Requirements: 13.1 - Display quiz list with search
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { QuizListParams, QuizListResponse } from './types';
import { quizKeys } from './keys';

/**
 * Fetch quizzes list
 * @param params - Filter parameters
 * @returns Paginated quiz list
 */
export async function fetchQuizzes(params: QuizListParams): Promise<QuizListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.page_size) searchParams.set('page_size', params.page_size.toString());
  if (params.search) searchParams.set('search', params.search);
  
  const url = `${API_ENDPOINTS.quizzes.list}?${searchParams.toString()}`;
  return api.get<QuizListResponse>(url);
}

/**
 * Hook to fetch quizzes list with pagination and search
 * Requirements: 13.1 - Display quiz list with search
 * @param params - Filter parameters
 */
export function useQuizzes(params: QuizListParams = {}) {
  return useQuery({
    queryKey: quizKeys.list(params),
    queryFn: () => fetchQuizzes(params),
  });
}
