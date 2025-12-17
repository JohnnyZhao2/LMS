/**
 * Get Pending Grading List API
 * Fetches list of submissions pending grading
 * @module features/grading/api/get-pending-grading-list
 * Requirements: 15.1 - 展示待评分考试列表
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { PaginatedResponse } from '@/types/api';
import type { GradingFilterParams, PendingGradingItem } from './types';
import { gradingKeys } from './keys';

/**
 * Get pending grading submissions list
 * Requirements: 15.1 - 展示待评分考试列表
 * @param params - Filter parameters
 * @returns Paginated pending grading list
 */
export async function getPendingGradingList(
  params?: GradingFilterParams
): Promise<PaginatedResponse<PendingGradingItem>> {
  const searchParams = new URLSearchParams();
  
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.page_size) searchParams.set('page_size', String(params.page_size));
  if (params?.search) searchParams.set('search', params.search);
  if (params?.task_id) searchParams.set('task_id', String(params.task_id));
  if (params?.student_id) searchParams.set('student_id', String(params.student_id));
  
  const queryString = searchParams.toString();
  const url = queryString 
    ? `${API_ENDPOINTS.grading.pendingList}?${queryString}`
    : API_ENDPOINTS.grading.pendingList;
    
  return api.get<PaginatedResponse<PendingGradingItem>>(url);
}

/**
 * Hook to fetch pending grading list
 * Requirements: 15.1
 * @param params - Filter parameters
 */
export function usePendingGradingList(params?: GradingFilterParams) {
  return useQuery({
    queryKey: gradingKeys.pending(params),
    queryFn: () => getPendingGradingList(params),
  });
}
