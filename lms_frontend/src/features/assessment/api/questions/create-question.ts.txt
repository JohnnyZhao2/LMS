import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterQuestionMutation } from '@/lib/cache-invalidation/questions';
import type { Question, QuestionCreateRequest } from '@/types/question';

export const createQuestion = (data: QuestionCreateRequest) =>
  apiClient.post<Question>('/questions/', data);

export const useCreateQuestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createQuestion,
    onSuccess: () => invalidateAfterQuestionMutation(queryClient),
  });
};
