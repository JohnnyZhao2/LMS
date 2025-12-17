/**
 * Submit Exam Answers API
 * Submits exam answers
 * @module features/tasks/api/submit-exam-answers
 * Requirements: 9.7 - 调用提交 API
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Submission } from '@/types/domain';
import { taskKeys } from './keys';

/**
 * Submit exam answers
 * Requirements: 9.7 - 调用提交 API
 * @param submissionId - Submission ID
 * @param answers - Answer map (question_id -> answer)
 * @returns Submission result
 */
export async function submitExamAnswers(
  submissionId: number | string,
  answers: Record<number, string | string[]>
): Promise<Submission> {
  return api.post<Submission>(
    API_ENDPOINTS.submissions.examSubmit(submissionId),
    { answers }
  );
}

/**
 * Hook to submit exam answers
 */
export function useSubmitExamAnswers() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ submissionId, answers }: { submissionId: number | string; answers: Record<number, string | string[]> }) =>
      submitExamAnswers(submissionId, answers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}
