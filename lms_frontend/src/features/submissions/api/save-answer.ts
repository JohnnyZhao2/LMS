import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SaveAnswerRequest } from '@/types/api';

interface SaveAnswerParams {
  assignmentId: number;
  type: 'practice' | 'exam';
  data: SaveAnswerRequest;
}

/**
 * 保存答案
 */
export const useSaveAnswer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, type, data }: SaveAnswerParams) =>
      apiClient.post(`/submissions/${type}/${assignmentId}/save-answer/`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['submission', variables.assignmentId] });
    },
  });
};


