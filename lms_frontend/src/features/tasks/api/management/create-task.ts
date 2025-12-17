/**
 * Create Task API
 * Creates a new task
 * @module features/tasks/api/management/create-task
 * Requirements: 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.13
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { Task } from '@/types/domain';
import type { TaskCreateRequest } from './types';
import { taskManagementKeys } from './keys';

/**
 * Create a new task
 * Requirements: 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.13
 * @param data - Task creation data
 * @returns Created task
 */
export async function createTask(data: TaskCreateRequest): Promise<Task> {
  return api.post<Task>(API_ENDPOINTS.tasks.list, data);
}

/**
 * Hook to create a new task
 * Requirements: 14.13 - Submit task creation
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskManagementKeys.lists() });
    },
  });
}
