/**
 * Remove Mentor API
 * Removes mentor from a student (unassign mentor-mentee relationship)
 * @module features/user-mgmt/api/mentorship/remove-mentor
 * Requirements: 19.6 - Remove mentor-mentee relationship
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Mentee } from './types';
import { mentorshipKeys } from './keys';

/**
 * Remove mentor from a student (unassign mentor-mentee relationship)
 * Requirements: 19.6 - Remove mentor-mentee relationship
 * @param studentId - Student ID
 * @returns Updated mentee
 */
export async function removeMentor(studentId: number): Promise<Mentee> {
  return api.post<Mentee>(API_ENDPOINTS.mentorship.remove(studentId), {});
}

/**
 * Hook to remove mentor from a student
 * Requirements: 19.6 - Remove mentor-mentee relationship
 */
export function useRemoveMentorFromStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studentId: number) => removeMentor(studentId),
    onSuccess: () => {
      // Invalidate all mentorship-related queries
      queryClient.invalidateQueries({ queryKey: mentorshipKeys.all });
      // Also invalidate user list since mentor changed
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
