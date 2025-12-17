/**
 * Get Department Members API
 * Fetches members of a specific department
 * @module features/user-mgmt/api/organization/get-department-members
 * Requirements: 19.1 - Display members of each room
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { DepartmentMember } from './types';
import { organizationKeys } from './keys';

/**
 * Fetch members of a specific department by ID
 * Requirements: 19.1 - Display members of each room
 * @param id - Department ID
 * @returns List of department members
 */
export async function fetchDepartmentMembersById(id: number): Promise<DepartmentMember[]> {
  return api.get<DepartmentMember[]>(API_ENDPOINTS.departments.members(id));
}

/**
 * Hook to fetch department members by department ID
 * Requirements: 19.1 - Display members of each room
 * @param id - Department ID
 */
export function useDepartmentMembersById(id: number | undefined) {
  return useQuery({
    queryKey: organizationKeys.departmentMembers(id!),
    queryFn: () => fetchDepartmentMembersById(id!),
    enabled: !!id,
  });
}
