import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { SubmissionDetail } from '@/features/quiz-attempts/types';

export const useSubmissionResult = (submissionId?: number, enabled = true) =>
  useQuery({
    queryKey: queryKeys.submissions.result({ submissionId }),
    queryFn: () => apiClient.get<SubmissionDetail>(`/submissions/${submissionId!}/result/`),
    enabled: Boolean(submissionId) && enabled,
  });
