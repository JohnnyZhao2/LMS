import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterTaskProgressMutation } from '@/lib/cache-invalidation';

interface CompleteLearningPayload {
  taskId: number;
  taskKnowledgeId: number;
}

/**
 * 完成学习子任务
 */
export const useCompleteLearning = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, taskKnowledgeId }: CompleteLearningPayload) =>
      apiClient.post(`/tasks/${taskId}/complete-knowledge/`, {
        task_knowledge_id: taskKnowledgeId,
      }),
    onSuccess: () => invalidateAfterTaskProgressMutation(queryClient),
  });
};
