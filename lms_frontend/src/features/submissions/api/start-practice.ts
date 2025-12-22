import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SubmissionDetail } from '@/types/api';

interface StartPracticePayload {
  assignmentId: number;
  quizId: number;
}

/**
 * 开始练习
 */
export const useStartPractice = () => {
  return useMutation({
    mutationFn: ({ assignmentId, quizId }: StartPracticePayload) =>
      apiClient.post<SubmissionDetail>('/submissions/practice/start/', {
        assignment_id: assignmentId,
        quiz_id: quizId,
      }),
  });
};