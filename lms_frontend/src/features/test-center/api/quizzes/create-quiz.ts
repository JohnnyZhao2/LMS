/**
 * Create Quiz API
 * Creates a new quiz
 * @module features/test-center/api/quizzes/create-quiz
 * Requirements: 13.2 - Create quiz form
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Quiz } from '@/types/domain';
import type { QuizCreateRequest } from './types';
import { quizKeys } from './keys';

/**
 * Create a new quiz
 * @param data - Quiz creation data
 * @returns Created quiz
 */
export async function createQuiz(data: QuizCreateRequest): Promise<Quiz> {
  return api.post<Quiz>(API_ENDPOINTS.quizzes.list, data);
}

/**
 * Hook to create a new quiz
 * Requirements: 13.2 - Create quiz form
 */
export function useCreateQuiz() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createQuiz,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.lists() });
    },
  });
}
