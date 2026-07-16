import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { TaskDetail } from '@/types/task';

export const getTaskDetail = (id: number) =>
  apiClient.get<TaskDetail>(`/tasks/${id}/`);

interface UseTaskDetailOptions {
  enabled?: boolean;
}

/**
 * 获取任务详情
 */
export const useTaskDetail = (id: number, options: UseTaskDetailOptions = {}) => {
  const currentRole = useCurrentRole();
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.tasks.detail({ currentRole, id }),
    queryFn: () => getTaskDetail(id),
    enabled: Boolean(id) && currentRole !== null && enabled,
  });
};
