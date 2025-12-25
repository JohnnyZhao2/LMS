import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { TaskDetail } from '@/types/api';

/**
 * 关闭任务
 */
export const useCloseTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: number) => {
      return apiClient.post<TaskDetail>(`/tasks/${taskId}/close/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-detail'] });
      queryClient.invalidateQueries({ queryKey: ['student-tasks'] });
    },
  });
};




