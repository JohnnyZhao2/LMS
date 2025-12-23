import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { TaskDetail } from '@/types/api';

/**
 * 更新任务请求
 */
export interface TaskUpdateRequest {
  title?: string;
  description?: string;
  deadline?: string;
  start_time?: string;
  duration?: number;
  pass_score?: number;
  knowledge_ids?: number[];
  quiz_ids?: number[];
  quiz_id?: number;
  assignee_ids?: number[];
}

/**
 * 更新任务
 */
export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: number; data: TaskUpdateRequest }) => {
      return apiClient.patch<TaskDetail>(`/tasks/${taskId}/`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-detail'] });
      queryClient.invalidateQueries({ queryKey: ['student-tasks'] });
    },
  });
};

