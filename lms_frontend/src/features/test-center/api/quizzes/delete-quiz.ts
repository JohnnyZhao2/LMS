/**
 * Delete Quiz API
 * Deletes a quiz
 * @module features/test-center/api/quizzes/delete-quiz
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import { quizKeys } from './keys';

/**
 * Delete a quiz
 * @param id - Quiz ID
 */
export async function deleteQuiz(id: number): Promise<void> {
  return api.delete<void>(API_ENDPOINTS.quizzes.detail(id));
}

/**
 * Hook to delete a quiz
 */
export function useDeleteQuiz() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteQuiz,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quizKeys.lists() });
    },
  });
}
