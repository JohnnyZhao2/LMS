/**
 * Force Close Task API
 * Force closes a task (admin only)
 * @module features/tasks/api/management/force-close-task
 * Requirements: 14.14 - Admin can force close tasks
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Task } from '@/types/domain';
import { taskManagementKeys } from './keys';

/**
 * Force close a task (admin only)
 * Requirements: 14.14 - Admin can force close tasks
 * @param id - Task ID
 * @returns Updated task
 */
export async function forceCloseTask(id: number | string): Promise<Task> {
  return api.post<Task>(`${API_ENDPOINTS.tasks.detail(id)}close/`, {});
}

/**
 * Hook to force close a task
 * Requirements: 14.14 - Admin force close
 */
export function useForceCloseTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: forceCloseTask,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: taskManagementKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskManagementKeys.detail(id) });
    },
  });
}
