/**
 * Get Team Overview API
 * Fetches team overview data for team manager
 * @module features/team/api/get-team-overview
 * Requirements: 20.1, 20.2
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { TeamOverviewResponse } from './types';

/**
 * Fetch team overview data
 * Requirements: 20.1, 20.2
 * @returns Team overview data
 */
export async function fetchTeamOverview(): Promise<TeamOverviewResponse> {
  return api.get<TeamOverviewResponse>(API_ENDPOINTS.analytics.teamOverview);
}

/**
 * Hook to fetch team overview data
 * Requirements: 20.1, 20.2
 */
export function useTeamOverview() {
  return useQuery({
    queryKey: ['team', 'overview'],
    queryFn: fetchTeamOverview,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
