/**
 * Get User List API
 * Fetches user list with optional filters
 * @module features/user-mgmt/api/users/get-user-list
 * Requirements: 18.1 - Display user list
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { UserListParams, UserListItem, PaginatedUserList } from './types';
import { userKeys } from './keys';

/**
 * Fetch user list with optional filters
 * Requirements: 18.1 - Display user list
 * Note: Backend returns array directly, we wrap it in pagination format for consistency
 * @param params - Filter parameters
 * @returns Paginated user list
 */
export async function fetchUserList(params: UserListParams = {}): Promise<PaginatedUserList> {
  const searchParams = new URLSearchParams();
  
  if (params.search) searchParams.set('search', params.search);
  if (params.department_id) searchParams.set('department_id', String(params.department_id));
  if (params.is_active !== undefined) searchParams.set('is_active', String(params.is_active));
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  
  const queryString = searchParams.toString();
  const url = queryString 
    ? `${API_ENDPOINTS.users.list}?${queryString}` 
    : API_ENDPOINTS.users.list;
  
  // Backend returns array directly, check and wrap in pagination format
  const response = await api.get<UserListItem[] | PaginatedUserList>(url);
  
  // If response is an array, wrap it in pagination format
  if (Array.isArray(response)) {
    // Client-side pagination
    const page = params.page || 1;
    const pageSize = params.page_size || 10;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedResults = response.slice(startIndex, endIndex);
    
    return {
      count: response.length,
      next: endIndex < response.length ? `page=${page + 1}` : null,
      previous: page > 1 ? `page=${page - 1}` : null,
      results: paginatedResults,
    };
  }
  
  // If already paginated format, return as is
  return response;
}

/**
 * Hook to fetch user list
 * Requirements: 18.1 - Display user list
 * @param params - Filter parameters
 */
export function useUserList(params: UserListParams = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => fetchUserList(params),
  });
}
