/**
 * Get Mentors API
 * Fetches all mentors (users with MENTOR role)
 * @module features/user-mgmt/api/mentorship/get-mentors
 * Requirements: 19.4 - Display mentor list
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { MentorWithMentees } from './types';
import { mentorshipKeys } from './keys';

/**
 * Fetch all mentors (users with MENTOR role)
 * Requirements: 19.4 - Display mentor list
 * @returns List of mentors
 */
export async function fetchMentors(): Promise<MentorWithMentees[]> {
  return api.get<MentorWithMentees[]>(API_ENDPOINTS.mentorship.mentors);
}

/**
 * Hook to fetch all mentors
 * Requirements: 19.4 - Display mentor list
 */
export function useMentors() {
  return useQuery({
    queryKey: mentorshipKeys.mentorList(),
    queryFn: fetchMentors,
  });
}
