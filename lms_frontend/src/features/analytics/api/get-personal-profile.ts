/**
 * Get Personal Profile API
 * Fetches personal profile information
 * @module features/analytics/api/get-personal-profile
 * Requirements: 10.1 - Display name, team, mentor info
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { PersonalProfile } from './types';
import { personalKeys } from './keys';

/**
 * Fetch personal profile
 * Requirements: 10.1 - Display name, team, mentor info
 * @returns Personal profile data
 */
export async function fetchPersonalProfile(): Promise<PersonalProfile> {
  return api.get<PersonalProfile>(API_ENDPOINTS.personalCenter.profile);
}

/**
 * Hook to fetch personal profile
 */
export function usePersonalProfile() {
  return useQuery({
    queryKey: personalKeys.profile(),
    queryFn: fetchPersonalProfile,
  });
}
