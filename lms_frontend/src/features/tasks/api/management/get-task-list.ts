/**
 * Get Task List API
 * Fetches task list for management
 * @module features/tasks/api/management/get-task-list
 * Requirements: 14.1 - Display task list with type and status filter
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { PaginatedResponse } from '@/types/api';
import type { TaskListParams, TaskListItem } from './types';
import { taskManagementKeys } from './keys';

/**
 * Fetch task list for management (导师/室经理/管理员)
 * Requirements: 14.1 - Display task list with type and status filter
 * @param params - Filter parameters
 * @returns Paginated task list
 */
export async function fetchTaskList(
  params: TaskListParams = {}
): Promise<PaginatedResponse<TaskListItem>> {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  if (params.search) searchParams.set('search', params.search);
  if (params.type) searchParams.set('type', params.type);
  if (params.status) searchParams.set('status', params.status);
  
  const queryString = searchParams.toString();
  const url = queryString 
    ? `${API_ENDPOINTS.tasks.list}?${queryString}` 
    : API_ENDPOINTS.tasks.list;
  
  return api.get<PaginatedResponse<TaskListItem>>(url);
}

/**
 * Hook to fetch task list for management
 * Requirements: 14.1 - Display task list
 * @param params - Filter parameters
 */
export function useTaskList(params: TaskListParams = {}) {
  return useQuery({
    queryKey: taskManagementKeys.list(params),
    queryFn: () => fetchTaskList(params),
  });
}
