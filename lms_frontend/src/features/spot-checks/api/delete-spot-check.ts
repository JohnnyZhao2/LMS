/**
 * Delete Spot Check API
 * Deletes a spot check record
 * @module features/spot-checks/api/delete-spot-check
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import { spotCheckKeys } from './keys';

/**
 * Delete a spot check record
 * @param id - Spot check ID
 */
export async function deleteSpotCheck(
  id: number | string
): Promise<void> {
  return api.delete<void>(API_ENDPOINTS.spotChecks.detail(id));
}

/**
 * Hook to delete a spot check
 */
export function useDeleteSpotCheck() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteSpotCheck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spotCheckKeys.lists() });
    },
  });
}
