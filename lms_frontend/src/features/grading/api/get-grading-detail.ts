/**
 * Get Grading Detail API
 * Fetches grading detail for a submission
 * @module features/grading/api/get-grading-detail
 * Requirements: 15.2 - 展示学员答案和评分输入界面
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { GradingDetailData } from './types';
import { gradingKeys } from './keys';

/**
 * Get grading detail for a submission
 * Requirements: 15.2 - 展示学员答案和评分输入界面
 * @param submissionId - Submission ID
 * @returns Grading detail data
 */
export async function getGradingDetail(
  submissionId: number | string
): Promise<GradingDetailData> {
  return api.get<GradingDetailData>(API_ENDPOINTS.grading.detail(submissionId));
}

/**
 * Hook to fetch grading detail
 * Requirements: 15.2
 * @param submissionId - Submission ID
 */
export function useGradingDetail(submissionId: number | string | undefined) {
  return useQuery({
    queryKey: gradingKeys.detail(submissionId!),
    queryFn: () => getGradingDetail(submissionId!),
    enabled: !!submissionId,
  });
}
