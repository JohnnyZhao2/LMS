/**
 * Update User Department API
 * Updates user's department assignment
 * @module features/user-mgmt/api/organization/update-user-department
 * Requirements: 19.2 - Adjust user's department
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { UpdateUserDepartmentRequest, DepartmentMember } from './types';
import { organizationKeys } from './keys';

/**
 * Update user's department assignment
 * Requirements: 19.2 - Adjust user's department
 * @param userId - User ID
 * @param data - New department data
 * @returns Updated member
 */
export async function updateUserDepartment(
  userId: number,
  data: UpdateUserDepartmentRequest
): Promise<DepartmentMember> {
  return api.patch<DepartmentMember>(
    API_ENDPOINTS.users.update(userId),
    { department_id: data.department_id }
  );
}

/**
 * Hook to update user's department
 * Requirements: 19.2 - Adjust user's department
 */
export function useUpdateUserDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: number; data: UpdateUserDepartmentRequest }) =>
      updateUserDepartment(userId, data),
    onSuccess: () => {
      // Invalidate all department-related queries
      queryClient.invalidateQueries({ queryKey: organizationKeys.departments() });
      // Also invalidate user list since department changed
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
