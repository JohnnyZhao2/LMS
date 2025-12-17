/**
 * Task Management Query Keys
 * React Query keys for task management data caching
 * @module features/tasks/api/management/keys
 */

import type { TaskListParams } from './types';

/**
 * Query keys for task management
 */
export const taskManagementKeys = {
  all: ['task-management'] as const,
  lists: () => [...taskManagementKeys.all, 'list'] as const,
  list: (params: TaskListParams) => [...taskManagementKeys.lists(), params] as const,
  details: () => [...taskManagementKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...taskManagementKeys.details(), id] as const,
  assignableStudents: () => [...taskManagementKeys.all, 'assignable-students'] as const,
};
