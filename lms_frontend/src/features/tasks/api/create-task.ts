import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterTaskMutation } from '@/lib/cache-invalidation';
import type { TaskDetail } from '@/types/task';

/**
 * 统一的任务创建请求
 */
export interface TaskCreateRequest {
  title: string;
  description?: string;
  deadline: string;
  knowledge_ids?: number[];
  quiz_ids?: number[];
  assignee_ids: number[];
}

/**
 * 创建任务（统一API）
 */
export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TaskCreateRequest) => {
      return apiClient.post<TaskDetail>('/tasks/create/', data);
    },
    onSuccess: () => invalidateAfterTaskMutation(queryClient),
  });
};
