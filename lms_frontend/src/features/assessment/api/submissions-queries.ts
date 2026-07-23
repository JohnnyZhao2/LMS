import {
  useQuery,
  type QueryClient,
} from '@tanstack/react-query';

import {
  getSubmissionResult,
  saveAnswer,
  startQuiz,
  submitQuiz,
} from '@/features/assessment/api/submissions-api';
import { tasksQueryKeys } from '@/features/tasks/api/tasks-queries';
import { useCurrentRole } from '@/hooks/use-current-role';
import { invalidateMany } from '@/lib/react-query/invalidate-many';
import { normalizeRoleKey, type QueryRole } from '@/lib/react-query/normalize-role-key';
import { useAppMutation } from '@/lib/react-query/use-app-mutation';

export const submissionsQueryKeys = {
  detailRoot: () => ['submission'] as const,
  detail: (submissionId: number) => ['submission', submissionId] as const,
  examResult: ({
    currentRole,
    submissionId,
  }: {
    currentRole: QueryRole;
    submissionId?: number;
  }) => ['exam-result', normalizeRoleKey(currentRole), submissionId] as const,
  practiceResult: ({
    currentRole,
    submissionId,
  }: {
    currentRole: QueryRole;
    submissionId?: number;
  }) => ['practice-result', normalizeRoleKey(currentRole), submissionId] as const,
} as const;

/**
 * 答案保存后失效对应 submission 详情缓存。
 */
export const invalidateAfterSubmissionAnswerSaved = (
  queryClient: QueryClient,
  submissionId: number,
) => invalidateMany(queryClient, [submissionsQueryKeys.detail(submissionId)]);

/**
 * 交卷后失效学员任务列表缓存。
 */
export const invalidateAfterSubmissionSubmitted = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [tasksQueryKeys.studentRoot()]);

type SubmissionResultKind = 'practice' | 'exam';

const useSubmissionResult = (
  kind: SubmissionResultKind,
  submissionId?: number,
  enabled = true,
) => {
  const currentRole = useCurrentRole();
  const isPractice = kind === 'practice';

  return useQuery({
    queryKey: isPractice
      ? submissionsQueryKeys.practiceResult({ currentRole, submissionId })
      : submissionsQueryKeys.examResult({ currentRole, submissionId }),
    queryFn: () => getSubmissionResult(submissionId!),
    enabled: Boolean(submissionId) && currentRole !== null && enabled,
  });
};

/**
 * 获取练习结果
 */
export const usePracticeResult = (submissionId?: number, enabled = true) =>
  useSubmissionResult('practice', submissionId, enabled);

/**
 * 获取考试结果
 */
export const useExamResult = (submissionId?: number, enabled = true) =>
  useSubmissionResult('exam', submissionId, enabled);

export const useStartQuiz = () => useAppMutation(startQuiz);

/**
 * 保存答案
 */
export const useSaveAnswer = () =>
  useAppMutation(saveAnswer, (qc, _data, variables) =>
    invalidateAfterSubmissionAnswerSaved(qc, variables.submissionId),
  );

export const useSubmitQuiz = () =>
  useAppMutation(submitQuiz, invalidateAfterSubmissionSubmitted);
