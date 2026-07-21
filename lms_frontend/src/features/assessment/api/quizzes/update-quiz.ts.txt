import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterQuizMutation } from '@/lib/cache-invalidation/quizzes';
import type { QuizCreateRequest, QuizDetail } from '@/types/quiz';

export const updateQuiz = ({ id, data }: { id: number; data: Partial<QuizCreateRequest> }) =>
  apiClient.patch<QuizDetail>(`/quizzes/${id}/`, data);

export const useUpdateQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateQuiz,
    onSuccess: () => invalidateAfterQuizMutation(queryClient),
  });
};
