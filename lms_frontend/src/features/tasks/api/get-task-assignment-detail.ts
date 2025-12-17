/**
 * Get Task Assignment Detail API
 * Fetches single task assignment detail
 * @module features/tasks/api/get-task-assignment-detail
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { TaskAssignmentDetail } from './types';
import { taskKeys } from './keys';

/**
 * Get single task assignment detail (学员任务中心)
 * @param assignmentId - Assignment ID
 * @returns Task assignment detail
 */
export async function getTaskAssignmentDetail(
  assignmentId: number | string
): Promise<TaskAssignmentDetail> {
  return api.get<TaskAssignmentDetail>(
    API_ENDPOINTS.studentTasks.detail(assignmentId)
  );
}

/**
 * Hook to fetch single task assignment detail
 * @param assignmentId - Assignment ID
 */
export function useTaskAssignmentDetail(assignmentId: number | string | undefined) {
  return useQuery({
    queryKey: taskKeys.assignment(assignmentId!),
    queryFn: () => getTaskAssignmentDetail(assignmentId!),
    enabled: !!assignmentId,
  });
}
