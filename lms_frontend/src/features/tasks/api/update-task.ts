import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient, ApiError } from '@/lib/api-client';
import type { TaskDetail } from '@/types/task';

/**
 * 更新任务请求
 */
interface TaskUpdateRequest {
  title?: string;
  description?: string;
  deadline?: string;
  knowledge_ids?: number[];
  quiz_ids?: number[];
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
    onError: (error: Error) => {
      if (error instanceof ApiError && error.code === 'INVALID_OPERATION') {
        toast.error(error.message);
      }
    },
  });
};
