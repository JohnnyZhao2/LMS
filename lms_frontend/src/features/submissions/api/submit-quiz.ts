import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { SubmissionDetail } from '@/features/submissions/types/submission';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterSubmissionSubmitted } from '@/lib/cache-invalidation/submissions';

export const submitQuiz = (submissionId: number) =>
  apiClient.post<SubmissionDetail>(`/submissions/${submissionId}/submit/`);

export const useSubmitQuiz = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitQuiz,
    onSuccess: () => invalidateAfterSubmissionSubmitted(queryClient),
  });
};
