/**
 * Get Spot Check List API
 * Fetches spot check records list
 * @module features/spot-checks/api/get-spot-check-list
 * Requirements: 16.1 - 展示抽查记录列表（按时间倒序）
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { PaginatedResponse } from '@/types/api';
import type { SpotCheckFilterParams, SpotCheckListItem } from './types';
import { spotCheckKeys } from './keys';

/**
 * Get spot check list (ordered by time descending)
 * Requirements: 16.1 - 展示抽查记录列表（按时间倒序）
 * @param params - Filter parameters
 * @returns Paginated spot check list
 */
export async function getSpotCheckList(
  params?: SpotCheckFilterParams
): Promise<PaginatedResponse<SpotCheckListItem>> {
  const searchParams = new URLSearchParams();
  
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.page_size) searchParams.set('page_size', String(params.page_size));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.student_id) searchParams.set('student_id', String(params.student_id));
  if (params?.checked_by_id) searchParams.set('checked_by_id', String(params.checked_by_id));
  if (params?.start_date) searchParams.set('start_date', params.start_date);
  if (params?.end_date) searchParams.set('end_date', params.end_date);
  // Default ordering by time descending
  searchParams.set('ordering', '-checked_at');
  
  const queryString = searchParams.toString();
  const url = queryString 
    ? `${API_ENDPOINTS.spotChecks.list}?${queryString}`
    : API_ENDPOINTS.spotChecks.list;
    
  return api.get<PaginatedResponse<SpotCheckListItem>>(url);
}

/**
 * Hook to fetch spot check list
 * Requirements: 16.1
 * @param params - Filter parameters
 */
export function useSpotCheckList(params?: SpotCheckFilterParams) {
  return useQuery({
    queryKey: spotCheckKeys.list(params),
    queryFn: () => getSpotCheckList(params),
  });
}
