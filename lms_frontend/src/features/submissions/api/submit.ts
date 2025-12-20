import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SubmissionDetail } from '@/types/api';

interface SubmitParams {
  assignmentId: number;
  type: 'practice' | 'exam';
}

/**
 * 提交练习/考试
 */
export const useSubmit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, type }: SubmitParams) =>
      apiClient.post<SubmissionDetail>(`/submissions/${type}/${assignmentId}/submit/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-tasks'] });
    },
  });
};


