/**
 * Create Question API
 * Creates a new question
 * @module features/test-center/api/questions/create-question
 * Requirements: 12.2 - Create question form
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Question } from '@/types/domain';
import type { QuestionCreateRequest } from './types';
import { questionKeys } from './keys';

/**
 * Create a new question
 * @param data - Question creation data
 * @returns Created question
 */
export async function createQuestion(data: QuestionCreateRequest): Promise<Question> {
  return api.post<Question>(API_ENDPOINTS.questions.list, data);
}

/**
 * Hook to create a new question
 * Requirements: 12.2 - Create question form
 */
export function useCreateQuestion() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
    },
  });
}
