/**
 * Submit Grading API
 * Submits grading for a submission
 * @module features/grading/api/submit-grading
 * Requirements: 15.4 - 调用评分 API 并更新列表状态
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { SubmitGradingRequest, SubmitGradingResponse } from './types';
import { gradingKeys } from './keys';

/**
 * Submit grading for a submission
 * Requirements: 15.4 - 调用评分 API 并更新列表状态
 * @param submissionId - Submission ID
 * @param data - Grading data
 * @returns Grading response
 */
export async function submitGrading(
  submissionId: number | string,
  data: SubmitGradingRequest
): Promise<SubmitGradingResponse> {
  return api.post<SubmitGradingResponse>(
    API_ENDPOINTS.grading.submit(submissionId),
    data
  );
}

/**
 * Hook to submit grading
 * Requirements: 15.4
 */
export function useSubmitGrading() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ submissionId, data }: { submissionId: number | string; data: SubmitGradingRequest }) =>
      submitGrading(submissionId, data),
    onSuccess: (_, variables) => {
      // Invalidate pending list to refresh
      queryClient.invalidateQueries({ queryKey: gradingKeys.all });
      // Invalidate the specific detail
      queryClient.invalidateQueries({ queryKey: gradingKeys.detail(variables.submissionId) });
    },
  });
}
