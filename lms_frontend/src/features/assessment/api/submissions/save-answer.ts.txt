import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterSubmissionAnswerSaved } from '@/lib/cache-invalidation/submissions';
import type { SaveAnswerRequest } from '@/features/assessment/types/submission';

export interface SaveAnswerParams {
  submissionId: number;
  data: SaveAnswerRequest;
}

export const saveAnswer = ({ submissionId, data }: SaveAnswerParams) =>
  apiClient.post(`/submissions/${submissionId}/save-answer/`, data);

/**
 * 保存答案
 */
export const useSaveAnswer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveAnswer,
    onSuccess: (_, variables) => invalidateAfterSubmissionAnswerSaved(queryClient, variables.submissionId),
  });
};
