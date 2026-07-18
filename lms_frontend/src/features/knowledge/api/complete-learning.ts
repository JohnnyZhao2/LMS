import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterTaskProgressMutation } from '@/lib/cache-invalidation/tasks';

interface CompleteLearningPayload {
  taskId: number;
  taskKnowledgeId: number;
}

export const completeLearning = ({ taskId, taskKnowledgeId }: CompleteLearningPayload) =>
  apiClient.post(`/tasks/${taskId}/complete-knowledge/`, {
    task_knowledge_id: taskKnowledgeId,
  });

/**
 * 完成学习子任务
 */
export const useCompleteLearning = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeLearning,
    onSuccess: () => invalidateAfterTaskProgressMutation(queryClient),
  });
};
