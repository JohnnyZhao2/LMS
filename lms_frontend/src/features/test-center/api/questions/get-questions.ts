/**
 * Get Questions API
 * Fetches questions list with pagination and filtering
 * @module features/test-center/api/questions/get-questions
 * Requirements: 12.1 - Display question list with search and filter
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { QuestionListParams, QuestionListResponse } from './types';
import { questionKeys } from './keys';

/**
 * Fetch questions list
 * @param params - Filter parameters
 * @returns Paginated question list
 */
export async function fetchQuestions(params: QuestionListParams): Promise<QuestionListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.page_size) searchParams.set('page_size', params.page_size.toString());
  if (params.search) searchParams.set('search', params.search);
  if (params.type) searchParams.set('type', params.type);
  
  const url = `${API_ENDPOINTS.questions.list}?${searchParams.toString()}`;
  return api.get<QuestionListResponse>(url);
}

/**
 * Hook to fetch questions list with pagination and filtering
 * Requirements: 12.1 - Display question list with search and filter
 * @param params - Filter parameters
 */
export function useQuestions(params: QuestionListParams = {}) {
  return useQuery({
    queryKey: questionKeys.list(params),
    queryFn: () => fetchQuestions(params),
  });
}
