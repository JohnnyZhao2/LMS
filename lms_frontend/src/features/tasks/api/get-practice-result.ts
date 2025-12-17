/**
 * Get Practice Result API
 * Fetches practice quiz result
 * @module features/tasks/api/get-practice-result
 * Requirements: 10.4 - 查看练习结果
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Submission } from '@/types/domain';
import type { QuizProgress } from '@/types/domain';

/**
 * Get practice result
 * Requirements: 10.4 - 查看练习结果
 * @param submissionId - Submission ID
 * @returns Practice submission result
 */
export async function getPracticeResult(
  submissionId: number | string
): Promise<Submission> {
  return api.get<Submission>(API_ENDPOINTS.submissions.practiceResult(submissionId));
}

/**
 * Get practice history for a task
 * @param taskId - Task ID
 * @returns Practice history
 */
export async function getPracticeHistory(
  taskId: number | string
): Promise<QuizProgress[]> {
  return api.get<QuizProgress[]>(API_ENDPOINTS.submissions.practiceHistory(taskId));
}

/**
 * Hook to get practice result
 * @param submissionId - Submission ID
 */
export function useGetPracticeResult(submissionId: number | string | undefined) {
  return useQuery({
    queryKey: ['practice', 'result', submissionId],
    queryFn: () => getPracticeResult(submissionId!),
    enabled: !!submissionId,
  });
}
