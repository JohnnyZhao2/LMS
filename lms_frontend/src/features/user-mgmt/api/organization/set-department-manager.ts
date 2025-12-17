/**
 * Set Department Manager API
 * Sets department manager
 * @module features/user-mgmt/api/organization/set-department-manager
 * Requirements: 19.3 - Designate room manager
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { SetDepartmentManagerRequest, Department } from './types';
import { organizationKeys } from './keys';

/**
 * Set department manager
 * Requirements: 19.3 - Designate room manager
 * @param departmentId - Department ID
 * @param data - Manager data
 * @returns Updated department
 */
export async function setDepartmentManager(
  departmentId: number,
  data: SetDepartmentManagerRequest
): Promise<Department> {
  return api.post<Department>(
    `${API_ENDPOINTS.departments.detail(departmentId)}set-manager/`,
    data
  );
}

/**
 * Hook to set department manager
 * Requirements: 19.3 - Designate room manager
 */
export function useSetDepartmentManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ departmentId, data }: { departmentId: number; data: SetDepartmentManagerRequest }) =>
      setDepartmentManager(departmentId, data),
    onSuccess: (_, variables) => {
      // Invalidate department list and detail
      queryClient.invalidateQueries({ queryKey: organizationKeys.departmentList() });
      queryClient.invalidateQueries({ queryKey: organizationKeys.departmentDetail(variables.departmentId) });
      // Also invalidate user list since roles may have changed
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
