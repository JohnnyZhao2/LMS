/**
 * Get Available Resources API
 * Fetches available knowledge and quizzes for task creation
 * @module features/tasks/api/management/get-available-resources
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Knowledge, Quiz } from '@/types/domain';
import type { PaginatedResponse } from '@/types/api';

/**
 * Fetch available knowledge documents for task creation
 * @returns List of knowledge documents
 */
export async function fetchAvailableKnowledge(): Promise<Knowledge[]> {
  const response = await api.get<PaginatedResponse<Knowledge> | Knowledge[]>(
    `${API_ENDPOINTS.knowledge.list}?page_size=1000`
  );
  // Handle both paginated and array responses
  if (Array.isArray(response)) {
    return response;
  }
  return response.results;
}

/**
 * Fetch available quizzes for task creation
 * @returns List of quizzes
 */
export async function fetchAvailableQuizzes(): Promise<Quiz[]> {
  const response = await api.get<PaginatedResponse<Quiz> | Quiz[]>(
    `${API_ENDPOINTS.quizzes.list}?page_size=1000`
  );
  // Handle both paginated and array responses
  if (Array.isArray(response)) {
    return response;
  }
  return response.results;
}

/**
 * Hook to fetch available knowledge documents
 */
export function useAvailableKnowledge() {
  return useQuery({
    queryKey: ['available-knowledge'],
    queryFn: fetchAvailableKnowledge,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Hook to fetch available quizzes
 */
export function useAvailableQuizzes() {
  return useQuery({
    queryKey: ['available-quizzes'],
    queryFn: fetchAvailableQuizzes,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
