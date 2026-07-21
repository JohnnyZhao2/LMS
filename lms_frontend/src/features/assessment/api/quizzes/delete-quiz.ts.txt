import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterQuizMutation } from '@/lib/cache-invalidation/quizzes';

export const deleteQuiz = (id: number) => apiClient.delete(`/quizzes/${id}/`);

export const useDeleteQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteQuiz,
    onSuccess: () => invalidateAfterQuizMutation(queryClient),
  });
};
