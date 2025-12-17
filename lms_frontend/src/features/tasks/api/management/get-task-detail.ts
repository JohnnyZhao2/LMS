/**
 * Get Task Detail API
 * Fetches single task detail for management
 * @module features/tasks/api/management/get-task-detail
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Task } from '@/types/domain';
import { taskManagementKeys } from './keys';

/**
 * Fetch single task detail
 * @param id - Task ID
 * @returns Task detail
 */
export async function fetchTaskDetail(id: number | string): Promise<Task> {
  return api.get<Task>(API_ENDPOINTS.tasks.detail(id));
}

/**
 * Hook to fetch task detail
 * @param id - Task ID
 */
export function useTaskDetail(id: number | string | undefined) {
  return useQuery({
    queryKey: taskManagementKeys.detail(id!),
    queryFn: () => fetchTaskDetail(id!),
    enabled: !!id,
  });
}
