import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterTaskMutation } from '@/lib/cache-invalidation';

/**
 * 删除任务
 */
export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: number) => {
      return apiClient.delete(`/tasks/${taskId}/`);
    },
    onSuccess: () => invalidateAfterTaskMutation(queryClient),
  });
};
