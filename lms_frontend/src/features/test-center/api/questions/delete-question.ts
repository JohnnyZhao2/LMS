/**
 * Delete Question API
 * Deletes a question
 * @module features/test-center/api/questions/delete-question
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import { questionKeys } from './keys';

/**
 * Delete a question
 * @param id - Question ID
 */
export async function deleteQuestion(id: number): Promise<void> {
  return api.delete<void>(API_ENDPOINTS.questions.detail(id));
}

/**
 * Hook to delete a question
 */
export function useDeleteQuestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
    },
  });
}
