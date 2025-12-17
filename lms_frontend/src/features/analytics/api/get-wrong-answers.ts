/**
 * Get Wrong Answers API
 * Fetches wrong answers from practice and exams
 * @module features/analytics/api/get-wrong-answers
 * Requirements: 10.3 - Display wrong answers from practice and exams
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { WrongAnswersParams, WrongAnswersResponse } from './types';
import { personalKeys } from './keys';

/**
 * Fetch wrong answers
 * Requirements: 10.3 - Display wrong answers from practice and exams
 * @param params - Filter parameters
 * @returns Wrong answers data
 */
export async function fetchWrongAnswers(
  params?: WrongAnswersParams
): Promise<WrongAnswersResponse> {
  const searchParams = new URLSearchParams();
  
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.page_size) searchParams.set('page_size', String(params.page_size));
  if (params?.question_type) searchParams.set('question_type', params.question_type);
  
  const queryString = searchParams.toString();
  const url = queryString
    ? `${API_ENDPOINTS.personalCenter.wrongAnswers}?${queryString}`
    : API_ENDPOINTS.personalCenter.wrongAnswers;
    
  return api.get<WrongAnswersResponse>(url);
}

/**
 * Hook to fetch wrong answers
 * @param params - Filter parameters
 */
export function useWrongAnswers(params?: WrongAnswersParams) {
  return useQuery({
    queryKey: personalKeys.wrongAnswers(params),
    queryFn: () => fetchWrongAnswers(params),
  });
}
