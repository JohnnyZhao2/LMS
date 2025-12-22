import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SubmissionDetail } from '@/types/api';

interface SubmitParams {
  submissionId: number;
  type: 'practice' | 'exam';
}

/**
 * 提交练习/考试
 */
export const useSubmit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ submissionId, type }: SubmitParams) =>
      apiClient.post<SubmissionDetail>(`/submissions/${submissionId}/submit-${type}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-tasks'] });
    },
  });
};


