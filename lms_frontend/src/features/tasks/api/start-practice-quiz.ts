/**
 * Start Practice Quiz API
 * Starts a practice quiz attempt
 * @module features/tasks/api/start-practice-quiz
 * Requirements: 10.2, 10.5
 */

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Submission } from '@/types/domain';

/**
 * Start a practice quiz attempt
 * Returns the submission with quiz questions for answering
 * Requirements: 10.2, 10.5
 * @param taskId - Task ID
 * @param quizId - Quiz ID
 * @returns Submission with quiz questions
 */
export async function startPracticeQuiz(
  taskId: number | string,
  quizId: number | string
): Promise<Submission> {
  return api.post<Submission>(
    API_ENDPOINTS.submissions.practiceStart,
    { task_id: taskId, quiz_id: quizId }
  );
}

/**
 * Hook to start practice quiz
 */
export function useStartPracticeQuiz() {
  return useMutation({
    mutationFn: ({ taskId, quizId }: { taskId: number | string; quizId: number | string }) =>
      startPracticeQuiz(taskId, quizId),
  });
}
