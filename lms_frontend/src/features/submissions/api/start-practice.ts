import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SubmissionDetail } from '@/types/api';

/**
 * 开始练习
 */
export const useStartPractice = () => {
  return useMutation({
    mutationFn: (assignmentId: number) =>
      apiClient.post<SubmissionDetail>(`/submissions/practice/${assignmentId}/start/`),
  });
};


