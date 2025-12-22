import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SubmissionDetail } from '@/types/api';

interface StartExamPayload {
  assignmentId: number;
}

/**
 * 开始考试
 */
export const useStartExam = () => {
  return useMutation({
    mutationFn: ({ assignmentId }: StartExamPayload) =>
      apiClient.post<SubmissionDetail>('/submissions/exam/start/', {
        assignment_id: assignmentId,
      }),
  });
};


