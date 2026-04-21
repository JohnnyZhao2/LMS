import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterQuizMutation } from '@/lib/cache-invalidation';
import type { QuizCreateRequest, QuizDetail } from '@/types/quiz';

/**
 * 创建试卷
 */
export const useCreateQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: QuizCreateRequest) => apiClient.post<QuizDetail>('/quizzes/', data),
    onSuccess: () => invalidateAfterQuizMutation(queryClient),
  });
};

/**
 * 更新试卷
 */
export const useUpdateQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<QuizCreateRequest> }) =>
      apiClient.patch<QuizDetail>(`/quizzes/${id}/`, data),
    onSuccess: () => invalidateAfterQuizMutation(queryClient),
  });
};

/**
 * 删除试卷
 */
export const useDeleteQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/quizzes/${id}/`),
    onSuccess: () => invalidateAfterQuizMutation(queryClient),
  });
};
