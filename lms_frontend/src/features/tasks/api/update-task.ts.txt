import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/lib/api-client';
import { invalidateAfterTaskMutation } from '@/lib/cache-invalidation/tasks';
import type { TaskDetail } from '@/types/task';
import { showApiError } from '@/lib/api-error-handler';

/**
 * 更新任务请求
 */
export interface TaskUpdateRequest {
  title?: string;
  description?: string;
  deadline?: string;
  knowledge_ids?: number[];
  quiz_ids?: number[];
  assignee_ids?: number[];
}

export const updateTask = ({ taskId, data }: { taskId: number; data: TaskUpdateRequest }) =>
  apiClient.patch<TaskDetail>(`/tasks/${taskId}/`, data);

/**
 * 更新任务
 */
export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTask,
    onSuccess: () => invalidateAfterTaskMutation(queryClient),
    onError: (error: Error) => {
      if (error instanceof ApiError && error.code === 'INVALID_OPERATION') {
        showApiError(error);
      }
    },
  });
};
