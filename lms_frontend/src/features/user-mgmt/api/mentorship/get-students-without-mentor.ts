/**
 * Get Students Without Mentor API
 * Fetches students without a mentor assigned
 * @module features/user-mgmt/api/mentorship/get-students-without-mentor
 * Requirements: 19.5 - For assigning mentor to students
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { StudentWithoutMentor } from './types';
import { mentorshipKeys } from './keys';

/**
 * Fetch students without a mentor assigned
 * Requirements: 19.5 - For assigning mentor to students
 * @returns List of students without mentor
 */
export async function fetchStudentsWithoutMentor(): Promise<StudentWithoutMentor[]> {
  return api.get<StudentWithoutMentor[]>(API_ENDPOINTS.mentorship.studentsWithoutMentor);
}

/**
 * Hook to fetch students without a mentor
 * Requirements: 19.5 - For assigning mentor
 */
export function useStudentsWithoutMentor() {
  return useQuery({
    queryKey: mentorshipKeys.studentsWithoutMentor(),
    queryFn: fetchStudentsWithoutMentor,
  });
}
