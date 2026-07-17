import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterQuestionMutation } from '@/lib/cache-invalidation/questions';
import { queryKeys } from '@/lib/query-keys';
import type { PaginatedResponse } from '@/types/common';
import type { Question, QuestionCreateRequest } from '@/types/question';

export const updateQuestion = ({
  id,
  data,
}: {
  id: number;
  data: Partial<QuestionCreateRequest>;
}) => apiClient.patch<Question>(`/questions/${id}/`, data);

const patchQuestionListCache = (
  current: PaginatedResponse<Question> | undefined,
  nextQuestion: Question,
) => {
  if (!current) return current;
  return {
    ...current,
    results: current.results.map((item) => (item.id === nextQuestion.id ? nextQuestion : item)),
  };
};

export const useUpdateQuestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateQuestion,
    onSuccess: (updatedQuestion) => {
      queryClient.setQueriesData(
        { queryKey: queryKeys.questions.all() },
        (current: PaginatedResponse<Question> | undefined) =>
          patchQuestionListCache(current, updatedQuestion),
      );
      queryClient.setQueriesData(
        { queryKey: queryKeys.questions.detailRoot() },
        (current: Question | undefined) =>
          current?.id === updatedQuestion.id ? updatedQuestion : current,
      );
      return invalidateAfterQuestionMutation(queryClient);
    },
  });
};
