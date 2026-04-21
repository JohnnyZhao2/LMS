import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterSubmissionAnswerSaved } from '@/lib/cache-invalidation';
import type { SaveAnswerRequest } from '@/types/submission';

interface SaveAnswerParams {
  submissionId: number;
  data: SaveAnswerRequest;
}

/**
 * 保存答案
 */
export const useSaveAnswer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ submissionId, data }: SaveAnswerParams) =>
      apiClient.post(`/submissions/${submissionId}/save-answer/`, data),
    onSuccess: (_, variables) => invalidateAfterSubmissionAnswerSaved(queryClient, variables.submissionId),
  });
};
