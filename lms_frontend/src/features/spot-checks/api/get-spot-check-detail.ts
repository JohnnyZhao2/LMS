/**
 * Get Spot Check Detail API
 * Fetches single spot check detail
 * @module features/spot-checks/api/get-spot-check-detail
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { SpotCheckDetail } from './types';
import { spotCheckKeys } from './keys';

/**
 * Get spot check detail
 * @param id - Spot check ID
 * @returns Spot check detail
 */
export async function getSpotCheckDetail(
  id: number | string
): Promise<SpotCheckDetail> {
  return api.get<SpotCheckDetail>(API_ENDPOINTS.spotChecks.detail(id));
}

/**
 * Hook to fetch spot check detail
 * @param id - Spot check ID
 */
export function useSpotCheckDetail(id: number | string | undefined) {
  return useQuery({
    queryKey: spotCheckKeys.detail(id!),
    queryFn: () => getSpotCheckDetail(id!),
    enabled: !!id,
  });
}
