import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { GradingQuestion } from '@/types/task-analytics';

export const getGradingQuestions = (taskId: number, quizId: number | null) =>
  apiClient.get<GradingQuestion[]>(`/grading/tasks/${taskId}/questions/?quiz_id=${quizId}`);

export const useGradingQuestions = (
  taskId: number,
  quizId: number | null,
  options: { enabled?: boolean } = {},
) => {
  const currentRole = useCurrentRole();
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.grading.questions({ currentRole, taskId, quizId }),
    queryFn: () => getGradingQuestions(taskId, quizId),
    enabled: Boolean(taskId) && Boolean(quizId) && currentRole !== null && enabled,
    placeholderData: keepPreviousData,
  });
};
