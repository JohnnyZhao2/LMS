import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SubmissionDetail } from '@/types/api';

/**
 * 开始考试
 */
export const useStartExam = () => {
  return useMutation({
    mutationFn: (assignmentId: number) =>
      apiClient.post<SubmissionDetail>(`/submissions/exam/${assignmentId}/start/`),
  });
};


