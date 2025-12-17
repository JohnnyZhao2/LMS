/**
 * Get Department Detail API
 * Fetches department detail
 * @module features/user-mgmt/api/organization/get-department-detail
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Department } from './types';
import { organizationKeys } from './keys';

/**
 * Fetch department detail
 * @param id - Department ID
 * @returns Department detail
 */
export async function fetchDepartmentDetail(id: number): Promise<Department> {
  return api.get<Department>(API_ENDPOINTS.departments.detail(id));
}

/**
 * Hook to fetch department detail
 * @param id - Department ID
 */
export function useDepartmentDetail(id: number | undefined) {
  return useQuery({
    queryKey: organizationKeys.departmentDetail(id!),
    queryFn: () => fetchDepartmentDetail(id!),
    enabled: !!id,
  });
}
