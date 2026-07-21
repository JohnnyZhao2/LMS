import { useMutation } from '@tanstack/react-query';

import type { SubmissionDetail } from '@/features/assessment/types/submission';
import { apiClient } from '@/lib/api-client';

export interface StartQuizPayload {
  assignmentId: number;
  quizId: number;
}

export const startQuiz = ({ assignmentId, quizId }: StartQuizPayload) =>
  apiClient.post<SubmissionDetail>('/submissions/start/', {
    assignment_id: assignmentId,
    quiz_id: quizId,
  });

export const useStartQuiz = () => useMutation({ mutationFn: startQuiz });
