import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterQuestionMutation } from '@/lib/cache-invalidation';
import type { QuestionCreateRequest, Question } from '@/types/question';

/**
 * 创建题目
 */
export const useCreateQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: QuestionCreateRequest) => apiClient.post<Question>('/questions/', data),
    onSuccess: () => invalidateAfterQuestionMutation(queryClient),
  });
};

/**
 * 更新题目
 */
export const useUpdateQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<QuestionCreateRequest> }) =>
      apiClient.patch<Question>(`/questions/${id}/`, data),
    onSuccess: () => invalidateAfterQuestionMutation(queryClient),
  });
};

/**
 * 删除题目
 */
export const useDeleteQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/questions/${id}/`),
    onSuccess: () => invalidateAfterQuestionMutation(queryClient),
  });
};
