/**
 * Update Question API
 * Updates an existing question
 * @module features/test-center/api/questions/update-question
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Question } from '@/types/domain';
import type { QuestionUpdateRequest } from './types';
import { questionKeys } from './keys';

/**
 * Update an existing question
 * @param id - Question ID
 * @param data - Question update data
 * @returns Updated question
 */
export async function updateQuestion(id: number, data: QuestionUpdateRequest): Promise<Question> {
  return api.patch<Question>(API_ENDPOINTS.questions.detail(id), data);
}

/**
 * Hook to update an existing question
 */
export function useUpdateQuestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: QuestionUpdateRequest }) => 
      updateQuestion(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: questionKeys.detail(id) });
    },
  });
}
