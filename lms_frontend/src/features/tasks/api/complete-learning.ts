import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

/**
 * 完成学习子任务
 */
export const useCompleteLearning = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assignmentId: number) =>
      apiClient.post(`/submissions/learning/${assignmentId}/complete/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['student-task-detail'] });
    },
  });
};


