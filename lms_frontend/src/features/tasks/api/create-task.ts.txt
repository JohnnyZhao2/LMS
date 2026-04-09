import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { TaskDetail } from '@/types/api';

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['student-tasks'] });
    },
  });
};
