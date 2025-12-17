/**
 * Submit Practice Answers API
 * Submits practice quiz answers
 * @module features/tasks/api/submit-practice-answers
 * Requirements: 8.6 - 展示自动判分结果和题目解析
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Submission } from '@/types/domain';
import { taskKeys } from './keys';

/**
 * Submit practice quiz answers
 * Requirements: 8.6 - 展示自动判分结果和题目解析
 * @param submissionId - Submission ID
 * @param answers - Answer map (question_id -> answer)
 * @returns Submission with grading results
 */
export async function submitPracticeAnswers(
  submissionId: number | string,
  answers: Record<number, string | string[]>
): Promise<Submission> {
  return api.post<Submission>(
    API_ENDPOINTS.submissions.practiceSubmit(submissionId),
    { answers }
  );
}

/**
 * Hook to submit practice answers
 */
export function useSubmitPracticeAnswers() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ submissionId, answers }: { submissionId: number | string; answers: Record<number, string | string[]> }) =>
      submitPracticeAnswers(submissionId, answers),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}
