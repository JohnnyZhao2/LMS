/**
 * Update Spot Check API
 * Updates an existing spot check record
 * @module features/spot-checks/api/update-spot-check
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { UpdateSpotCheckRequest, SpotCheckDetail } from './types';
import { spotCheckKeys } from './keys';

/**
 * Update a spot check record
 * @param id - Spot check ID
 * @param data - Spot check update data
 * @returns Updated spot check
 */
export async function updateSpotCheck(
  id: number | string,
  data: UpdateSpotCheckRequest
): Promise<SpotCheckDetail> {
  return api.patch<SpotCheckDetail>(API_ENDPOINTS.spotChecks.detail(id), data);
}

/**
 * Hook to update a spot check
 */
export function useUpdateSpotCheck() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateSpotCheckRequest }) =>
      updateSpotCheck(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: spotCheckKeys.lists() });
      queryClient.invalidateQueries({ queryKey: spotCheckKeys.detail(variables.id) });
    },
  });
}
