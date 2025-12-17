/**
 * Get Task Assignments API
 * Fetches task assignments for current student
 * @module features/tasks/api/get-task-assignments
 * Requirements: 6.1 - 展示任务列表
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { PaginatedResponse, TaskFilterParams } from '@/types/api';
import type { TaskAssignmentDetail } from './types';
import { taskKeys } from './keys';

/**
 * Get task assignments for current user (学员任务中心)
 * @param params - Filter parameters
 * @returns Paginated task assignments
 */
export async function getTaskAssignments(
  params?: TaskFilterParams
): Promise<PaginatedResponse<TaskAssignmentDetail>> {
  const searchParams = new URLSearchParams();
  
  if (params?.type) searchParams.set('task_type', params.type);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.page_size) searchParams.set('page_size', String(params.page_size));
  if (params?.search) searchParams.set('search', params.search);
  
  const queryString = searchParams.toString();
  const url = queryString 
    ? `${API_ENDPOINTS.studentTasks.list}?${queryString}`
    : API_ENDPOINTS.studentTasks.list;
    
  return api.get<PaginatedResponse<TaskAssignmentDetail>>(url);
}

/**
 * Hook to fetch task assignments
 * @param params - Filter parameters
 */
export function useTaskAssignments(params?: TaskFilterParams) {
  return useQuery({
    queryKey: taskKeys.assignments(params),
    queryFn: () => getTaskAssignments(params),
  });
}
