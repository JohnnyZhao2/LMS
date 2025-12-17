/**
 * Get Assignable Students API
 * Fetches students that can be assigned to tasks
 * @module features/tasks/api/management/get-assignable-students
 * Requirements: 14.10, 14.11, 14.12 - Role-based student filtering
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { AssignableStudent } from './types';
import { taskManagementKeys } from './keys';

/**
 * Fetch assignable students based on current user's role
 * Requirements: 14.10, 14.11, 14.12
 * - Mentor: only their mentees
 * - Dept Manager: only department members
 * - Admin: all students
 * @returns List of assignable students
 */
export async function fetchAssignableStudents(): Promise<AssignableStudent[]> {
  // The backend will filter based on the current user's role
  return api.get<AssignableStudent[]>(`${API_ENDPOINTS.tasks.list}assignable-students/`);
}

/**
 * Hook to fetch assignable students
 * Requirements: 14.10, 14.11, 14.12 - Role-based student filtering
 */
export function useAssignableStudents() {
  return useQuery({
    queryKey: taskManagementKeys.assignableStudents(),
    queryFn: fetchAssignableStudents,
  });
}
