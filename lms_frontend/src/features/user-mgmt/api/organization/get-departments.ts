/**
 * Get Departments API
 * Fetches all departments/rooms list
 * @module features/user-mgmt/api/organization/get-departments
 * Requirements: 19.1 - Display room list
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Department } from './types';
import { organizationKeys } from './keys';

/**
 * Fetch all departments/rooms list
 * Requirements: 19.1 - Display room list
 * @returns List of departments
 */
export async function fetchDepartments(): Promise<Department[]> {
  return api.get<Department[]>(API_ENDPOINTS.departments.list);
}

/**
 * Hook to fetch all departments
 * Requirements: 19.1 - Display room list
 */
export function useDepartments() {
  return useQuery({
    queryKey: organizationKeys.departmentList(),
    queryFn: fetchDepartments,
  });
}
