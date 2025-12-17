/**
 * Get Department Members API
 * Fetches department members for current department manager
 * @module features/user-mgmt/api/users/get-department-members
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { UserListItem } from './types';
import { userKeys } from './keys';

/**
 * Fetch department members for current department manager
 * @returns List of department members
 */
export async function fetchDepartmentMembers(): Promise<UserListItem[]> {
  return api.get<UserListItem[]>(API_ENDPOINTS.users.departmentMembers);
}

/**
 * Hook to fetch department members
 */
export function useDepartmentMembers() {
  return useQuery({
    queryKey: userKeys.departmentMembers(),
    queryFn: fetchDepartmentMembers,
  });
}
