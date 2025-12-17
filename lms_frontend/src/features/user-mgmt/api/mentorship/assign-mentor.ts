/**
 * Assign Mentor API
 * Assigns a mentor to a student
 * @module features/user-mgmt/api/mentorship/assign-mentor
 * Requirements: 19.5 - Assign mentor to student
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { AssignMentorRequest, Mentee } from './types';
import { mentorshipKeys } from './keys';

/**
 * Assign a mentor to a student
 * Requirements: 19.5 - Assign mentor to student
 * @param studentId - Student ID
 * @param data - Mentor to assign
 * @returns Updated mentee
 */
export async function assignMentor(
  studentId: number,
  data: AssignMentorRequest
): Promise<Mentee> {
  return api.post<Mentee>(API_ENDPOINTS.mentorship.assign(studentId), data);
}

/**
 * Hook to assign a mentor to a student
 * Requirements: 19.5 - Assign mentor to student
 */
export function useAssignMentorToStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, data }: { studentId: number; data: AssignMentorRequest }) =>
      assignMentor(studentId, data),
    onSuccess: (_, variables) => {
      // Invalidate mentor list (mentee count changed)
      queryClient.invalidateQueries({ queryKey: mentorshipKeys.mentorList() });
      // Invalidate the specific mentor's mentees list
      queryClient.invalidateQueries({ 
        queryKey: mentorshipKeys.mentorMentees(variables.data.mentor_id) 
      });
      // Invalidate students without mentor list
      queryClient.invalidateQueries({ queryKey: mentorshipKeys.studentsWithoutMentor() });
      // Also invalidate user list since mentor changed
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
