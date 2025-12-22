import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface CompleteLearningPayload {
  taskId: number;
  knowledgeId: number;
}

/**
 * 完成学习子任务
 */
export const useCompleteLearning = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, knowledgeId }: CompleteLearningPayload) =>
      apiClient.post(`/tasks/${taskId}/complete-knowledge/`, {
        knowledge_id: knowledgeId,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-detail', variables.taskId] });
      queryClient.invalidateQueries({
        queryKey: ['student-learning-task-detail', variables.taskId],
      });
    },
  });
};

