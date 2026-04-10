import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse, QuestionCreateRequest, Question } from '@/types/api';

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
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
        { queryKey: ['questions'] },
        (current: PaginatedResponse<Question> | undefined) => patchQuestionListCache(current, updatedQuestion),
      );
      queryClient.setQueriesData(
        { queryKey: ['question-detail'] },
        (current: Question | undefined) => (current?.id === updatedQuestion.id ? updatedQuestion : current),
      );
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['question-detail'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
  });
};

