import {
  keepPreviousData,
  useQuery,
  type QueryClient,
} from '@tanstack/react-query';

import {
  getGradingAnswers,
  getGradingQuestions,
  getPendingGrading,
  submitGrading,
} from '@/features/assessment/api/grading-api';
import { useCurrentRole } from '@/hooks/use-current-role';
import { invalidateMany } from '@/lib/react-query/invalidate-many';
import { normalizeRoleKey, type QueryRole } from '@/lib/react-query/normalize-role-key';
import { useAppMutation } from '@/lib/react-query/use-app-mutation';
import type { GradingSubmitRequest } from '@/types/task-analytics';

export const gradingQueryKeys = {
  pendingRoot: () => ['grading', 'pending'] as const,
  pending: (currentRole: QueryRole) =>
    ['grading', 'pending', normalizeRoleKey(currentRole)] as const,
  taskAnalyticsRoot: () => ['task-analytics'] as const,
  taskAnalytics: ({
    currentRole,
    taskId,
  }: {
    currentRole: QueryRole;
    taskId: number;
  }) => ['task-analytics', normalizeRoleKey(currentRole), taskId] as const,
  studentExecutionsRoot: () => ['student-executions'] as const,
  studentExecutions: ({
    currentRole,
    taskId,
  }: {
    currentRole: QueryRole;
    taskId: number;
  }) => ['student-executions', normalizeRoleKey(currentRole), taskId] as const,
  questionsRoot: () => ['grading-questions'] as const,
  questions: ({
    currentRole,
    taskId,
    quizId,
  }: {
    currentRole: QueryRole;
    taskId: number;
    quizId: number | null;
  }) => ['grading-questions', normalizeRoleKey(currentRole), taskId, quizId] as const,
  answersRoot: () => ['grading-answers'] as const,
  answers: ({
    currentRole,
    taskId,
    quizId,
    questionId,
  }: {
    currentRole: QueryRole;
    taskId: number;
    quizId: number | null;
    questionId: number | null;
  }) =>
    ['grading-answers', normalizeRoleKey(currentRole), taskId, quizId, questionId] as const,
} as const;

/**
 * 批改提交后失效批改相关与任务分析缓存。
 */
export const invalidateAfterGradingMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    gradingQueryKeys.answersRoot(),
    gradingQueryKeys.questionsRoot(),
    gradingQueryKeys.pendingRoot(),
    gradingQueryKeys.taskAnalyticsRoot(),
    gradingQueryKeys.studentExecutionsRoot(),
  ]);

interface UsePendingQuizzesOptions {
  enabled?: boolean;
}

export const usePendingQuizzes = (options: UsePendingQuizzesOptions = {}) => {
  const currentRole = useCurrentRole();
  const { enabled = true } = options;

  return useQuery({
    queryKey: gradingQueryKeys.pending(currentRole),
    queryFn: getPendingGrading,
    enabled: currentRole !== null && enabled,
  });
};

export const useGradingQuestions = (
  taskId: number,
  quizId: number | null,
  options: { enabled?: boolean } = {},
) => {
  const currentRole = useCurrentRole();
  const { enabled = true } = options;
  return useQuery({
    queryKey: gradingQueryKeys.questions({ currentRole, taskId, quizId }),
    queryFn: () => getGradingQuestions(taskId, quizId),
    enabled: Boolean(taskId) && Boolean(quizId) && currentRole !== null && enabled,
    placeholderData: keepPreviousData,
  });
};

export const useGradingAnswers = (
  taskId: number,
  questionId: number | null,
  quizId: number | null,
  options: { enabled?: boolean } = {},
) => {
  const currentRole = useCurrentRole();
  const { enabled = true } = options;
  return useQuery({
    queryKey: gradingQueryKeys.answers({ currentRole, taskId, quizId, questionId }),
    queryFn: () => getGradingAnswers(taskId, questionId, quizId),
    enabled:
      Boolean(taskId) &&
      Boolean(quizId) &&
      Boolean(questionId) &&
      currentRole !== null &&
      enabled,
  });
};

interface SubmitGradingOptions {
  beforeInvalidate?: (variables: GradingSubmitRequest) => void | Promise<void>;
  afterInvalidate?: (variables: GradingSubmitRequest) => void;
}

export const useSubmitGrading = (taskId: number, options: SubmitGradingOptions = {}) =>
  useAppMutation(
    (data: GradingSubmitRequest) => submitGrading(taskId, data),
    async (qc, _data, variables) => {
      await options.beforeInvalidate?.(variables);
      await invalidateAfterGradingMutation(qc);
      options.afterInvalidate?.(variables);
    },
  );
