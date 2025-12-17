/**
 * Task Query Keys
 * React Query keys for task data caching
 * @module features/tasks/api/keys
 */

import type { TaskFilterParams } from '@/types/api';

/**
 * Query keys for student task assignments
 */
export const taskKeys = {
  all: ['tasks'] as const,
  assignments: (params?: TaskFilterParams) => [...taskKeys.all, 'assignments', params] as const,
  assignment: (id: number | string) => [...taskKeys.all, 'assignment', id] as const,
};
