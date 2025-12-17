/**
 * Update Quiz API
 * Updates an existing quiz
 * @module features/test-center/api/quizzes/update-quiz
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Quiz } from '@/types/domain';
import type { QuizUpdateRequest } from './types';
import { quizKeys } from './keys';

/**
 * Update an existing quiz
 * @param id - Quiz ID
 * @param data - Quiz update data
 * @returns Updated quiz
 */
export async function updateQuiz(id: number, data: QuizUpdateRequest): Promise<Quiz> {
  return api.patch<Quiz>(API_ENDPOINTS.quizzes.detail(id), data);
}

/**
 * Hook to update an existing quiz
 */
export function useUpdateQuiz() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: QuizUpdateRequest }) => 
      updateQuiz(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: quizKeys.lists() });
      queryClient.invalidateQueries({ queryKey: quizKeys.detail(id) });
    },
  });
}
