/**
 * Get Mentor Mentees API
 * Fetches mentees for a specific mentor
 * @module features/user-mgmt/api/mentorship/get-mentor-mentees
 * Requirements: 19.4 - Display mentees of each mentor
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Mentee } from './types';
import { mentorshipKeys } from './keys';

/**
 * Fetch mentees for a specific mentor
 * Requirements: 19.4 - Display mentees of each mentor
 * @param mentorId - Mentor ID
 * @returns List of mentees
 */
export async function fetchMentorMentees(mentorId: number): Promise<Mentee[]> {
  return api.get<Mentee[]>(API_ENDPOINTS.mentorship.mentorWithMentees(mentorId));
}

/**
 * Hook to fetch mentees for a specific mentor
 * Requirements: 19.4 - Display mentees of each mentor
 * @param mentorId - Mentor ID
 */
export function useMentorMentees(mentorId: number | undefined) {
  return useQuery({
    queryKey: mentorshipKeys.mentorMentees(mentorId!),
    queryFn: () => fetchMentorMentees(mentorId!),
    enabled: !!mentorId,
  });
}
