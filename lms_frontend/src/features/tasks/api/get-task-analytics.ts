import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { TaskAnalytics } from '@/types/task-analytics';

export const getTaskAnalytics = (taskId: number) =>
  apiClient.get<TaskAnalytics>(`/tasks/${taskId}/analytics/`);

export const useTaskAnalytics = (taskId: number, options: { enabled?: boolean } = {}) => {
  const currentRole = useCurrentRole();
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.grading.taskAnalytics({ currentRole, taskId }),
    queryFn: () => getTaskAnalytics(taskId),
    enabled: Boolean(taskId) && currentRole !== null && enabled,
  });
};
