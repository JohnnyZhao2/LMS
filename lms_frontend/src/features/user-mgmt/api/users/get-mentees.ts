/**
 * Get Mentees API
 * Fetches mentees for current mentor
 * @module features/user-mgmt/api/users/get-mentees
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { UserListItem } from './types';
import { userKeys } from './keys';

/**
 * Fetch mentees for current mentor
 * @returns List of mentees
 */
export async function fetchMentees(): Promise<UserListItem[]> {
  return api.get<UserListItem[]>(API_ENDPOINTS.users.mentees);
}

/**
 * Hook to fetch mentees
 */
export function useMentees() {
  return useQuery({
    queryKey: userKeys.mentees(),
    queryFn: fetchMentees,
  });
}
