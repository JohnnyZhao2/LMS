import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { PracticeResult } from '@/features/submissions/types/submission';

type SubmissionResultKind = 'practice' | 'exam';

export const getSubmissionResult = (submissionId: number) =>
  apiClient.get<PracticeResult>(`/submissions/${submissionId}/result/`);

const useSubmissionResult = (
  kind: SubmissionResultKind,
  submissionId?: number,
  enabled = true,
) => {
  const currentRole = useCurrentRole();
  const isPractice = kind === 'practice';

  return useQuery({
    queryKey: isPractice
      ? queryKeys.submissions.practiceResult({ currentRole, submissionId })
      : queryKeys.submissions.examResult({ currentRole, submissionId }),
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
