/**
 * Get User Detail API
 * Fetches single user detail
 * @module features/user-mgmt/api/users/get-user-detail
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { UserDetail } from './types';
import { userKeys } from './keys';

/**
 * Fetch single user detail
 * @param id - User ID
 * @returns User detail
 */
export async function fetchUserDetail(id: number | string): Promise<UserDetail> {
  return api.get<UserDetail>(API_ENDPOINTS.users.detail(id));
}

/**
 * Hook to fetch user detail
 * @param id - User ID
 */
export function useUserDetail(id: number | string | undefined) {
  return useQuery({
    queryKey: userKeys.detail(id!),
    queryFn: () => fetchUserDetail(id!),
    enabled: !!id,
  });
}
