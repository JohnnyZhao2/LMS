/**
 * Get Exam Result API
 * Fetches exam submission result
 * @module features/tasks/api/get-exam-result
 * Requirements: 9.8 - 展示「查看结果」
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Submission } from '@/types/domain';

/**
 * Get exam submission result
 * Requirements: 9.8 - 展示「查看结果」
 * @param submissionId - Submission ID
 * @returns Exam submission result
 */
export async function getExamResult(
  submissionId: number | string
): Promise<Submission> {
  return api.get<Submission>(API_ENDPOINTS.submissions.examResult(submissionId));
}

/**
 * Hook to get exam result
 * @param submissionId - Submission ID
 */
export function useGetExamResult(submissionId: number | string | undefined) {
  return useQuery({
    queryKey: ['exam', 'result', submissionId],
    queryFn: () => getExamResult(submissionId!),
    enabled: !!submissionId,
  });
}
