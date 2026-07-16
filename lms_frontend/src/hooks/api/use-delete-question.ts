import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterQuestionMutation } from '@/lib/cache-invalidation/questions';

export const deleteQuestion = (id: number) => apiClient.delete(`/questions/${id}/`);

export const useDeleteQuestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteQuestion,
    onSuccess: () => invalidateAfterQuestionMutation(queryClient),
  });
};
