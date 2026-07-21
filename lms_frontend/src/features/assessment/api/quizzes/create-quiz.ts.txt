import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterQuizMutation } from '@/lib/cache-invalidation/quizzes';
import type { QuizCreateRequest, QuizDetail } from '@/types/quiz';

export const createQuiz = (data: QuizCreateRequest) =>
  apiClient.post<QuizDetail>('/quizzes/', data);

export const useCreateQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createQuiz,
    onSuccess: () => invalidateAfterQuizMutation(queryClient),
  });
};
