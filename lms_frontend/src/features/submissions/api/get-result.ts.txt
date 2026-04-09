import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { PracticeResult } from '@/types/api';

type SubmissionResultKind = 'practice' | 'exam';

const useSubmissionResult = (
  kind: SubmissionResultKind,
  submissionId?: number,
  enabled = true,
) => {
  const currentRole = useCurrentRole();
  const isPractice = kind === 'practice';
  const resultKey = isPractice ? 'practice-result' : 'exam-result';

  return useQuery({
    queryKey: [resultKey, currentRole ?? 'UNKNOWN', submissionId],
    queryFn: () =>
      apiClient.get<PracticeResult>(
        isPractice
          ? `/submissions/${submissionId!}/result/`
          : `/submissions/exam/${submissionId!}/result/`,
      ),
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
