/**
 * Create Spot Check API
 * Creates a new spot check record
 * @module features/spot-checks/api/create-spot-check
 * Requirements: 16.2 - 展示抽查记录创建表单
 * Requirements: 16.3 - 要求选择被抽查学员、填写抽查内容、评分和评语
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { CreateSpotCheckRequest, SpotCheckDetail } from './types';
import { spotCheckKeys } from './keys';

/**
 * Create a new spot check record
 * Requirements: 16.2 - 展示抽查记录创建表单
 * Requirements: 16.3 - 要求选择被抽查学员、填写抽查内容、评分和评语
 * @param data - Spot check creation data
 * @returns Created spot check
 */
export async function createSpotCheck(
  data: CreateSpotCheckRequest
): Promise<SpotCheckDetail> {
  return api.post<SpotCheckDetail>(API_ENDPOINTS.spotChecks.list, data);
}

/**
 * Hook to create a spot check
 * Requirements: 16.2, 16.3
 */
export function useCreateSpotCheck() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createSpotCheck,
    onSuccess: () => {
      // Invalidate list to refresh
      queryClient.invalidateQueries({ queryKey: spotCheckKeys.lists() });
    },
  });
}
