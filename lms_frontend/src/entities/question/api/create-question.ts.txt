import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterQuestionMutation } from '@/lib/cache-invalidation';
import { queryKeys } from '@/lib/query-keys';
import type { PaginatedResponse } from '@/types/common';
import type { QuestionCreateRequest, Question } from '@/types/question';

const patchQuestionListCache = (
  current: PaginatedResponse<Question> | undefined,
  nextQuestion: Question,
) => {
  if (!current) {
    return current;
  }

  return {
    ...current,
    results: current.results.map((item) => (item.id === nextQuestion.id ? nextQuestion : item)),
  };
};

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
    onSuccess: (updatedQuestion) => {
      queryClient.setQueriesData(
        { queryKey: queryKeys.questions.all() },
        (current: PaginatedResponse<Question> | undefined) => patchQuestionListCache(current, updatedQuestion),
      );
      queryClient.setQueriesData(
        { queryKey: queryKeys.questions.detailRoot() },
        (current: Question | undefined) => (current?.id === updatedQuestion.id ? updatedQuestion : current),
      );
      return invalidateAfterQuestionMutation(queryClient);
    },
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
