import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterTaskProgressMutation } from '@/lib/cache-invalidation/tasks';

interface CompleteKnowledgePayload {
  taskId: number;
  taskKnowledgeId: number;
}

export const completeKnowledge = ({ taskId, taskKnowledgeId }: CompleteKnowledgePayload) =>
  apiClient.post(`/tasks/${taskId}/complete-knowledge/`, {
    task_knowledge_id: taskKnowledgeId,
  });

/** 完成任务中的知识学习节点 */
export const useCompleteKnowledge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeKnowledge,
    onSuccess: () => invalidateAfterTaskProgressMutation(queryClient),
  });
};
