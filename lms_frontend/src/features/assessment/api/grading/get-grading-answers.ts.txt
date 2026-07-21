import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { GradingAnswerResponse } from '@/types/task-analytics';

export const getGradingAnswers = (
  taskId: number,
  questionId: number | null,
  quizId: number | null,
) =>
  apiClient.get<GradingAnswerResponse>(
    `/grading/tasks/${taskId}/answers/?question_id=${questionId}&quiz_id=${quizId}`,
  );

export const useGradingAnswers = (
  taskId: number,
  questionId: number | null,
  quizId: number | null,
  options: { enabled?: boolean } = {},
) => {
  const currentRole = useCurrentRole();
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.grading.answers({ currentRole, taskId, quizId, questionId }),
    queryFn: () => getGradingAnswers(taskId, questionId, quizId),
    enabled:
      Boolean(taskId) &&
      Boolean(quizId) &&
      Boolean(questionId) &&
      currentRole !== null &&
      enabled,
  });
};
