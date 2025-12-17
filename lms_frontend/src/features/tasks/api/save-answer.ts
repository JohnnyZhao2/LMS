/**
 * Save Answer API
 * Saves answer during exam/practice
 * @module features/tasks/api/save-answer
 */

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

/**
 * Save answer during exam/practice
 * @param submissionId - Submission ID
 * @param questionId - Question ID
 * @param answer - User answer
 * @returns Success status
 */
export async function saveAnswer(
  submissionId: number | string,
  questionId: number,
  answer: string | string[]
): Promise<{ success: boolean }> {
  return api.post<{ success: boolean }>(
    API_ENDPOINTS.submissions.saveAnswer(submissionId),
    { question_id: questionId, answer }
  );
}

/**
 * Hook to save answer
 */
export function useSaveAnswer() {
  return useMutation({
    mutationFn: ({ submissionId, questionId, answer }: { submissionId: number | string; questionId: number; answer: string | string[] }) =>
      saveAnswer(submissionId, questionId, answer),
  });
}
