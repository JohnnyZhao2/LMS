import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterTaskMutation } from '@/lib/cache-invalidation/tasks';

export const deleteTask = (taskId: number) => apiClient.delete(`/tasks/${taskId}/`);

/**
 * 删除任务
 */
export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTask,
    onSuccess: () => invalidateAfterTaskMutation(queryClient),
  });
};
