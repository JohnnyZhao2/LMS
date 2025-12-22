import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SaveAnswerRequest } from '@/types/api';

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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['submission', variables.submissionId] });
    },
  });
};


