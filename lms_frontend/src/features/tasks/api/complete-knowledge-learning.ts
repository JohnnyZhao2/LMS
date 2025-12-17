/**
 * Complete Knowledge Learning API
 * Marks knowledge item as completed in a learning task
 * @module features/tasks/api/complete-knowledge-learning
 * Requirements: 7.4 - 调用 API 记录完成状态
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import { taskKeys } from './keys';

/**
 * Mark knowledge item as completed in a learning task
 * Requirements: 7.4 - 调用 API 记录完成状态
 * @param assignmentId - Task assignment ID
 * @param knowledgeId - Knowledge document ID
 * @returns Completion result
 */
export async function completeKnowledgeLearning(
  assignmentId: number | string,
  knowledgeId: number | string
): Promise<{ success: boolean; completed_at: string }> {
  return api.post<{ success: boolean; completed_at: string }>(
    API_ENDPOINTS.tasks.completeKnowledge(assignmentId, knowledgeId)
  );
}

/**
 * Hook to complete knowledge learning
 */
export function useCompleteKnowledgeLearning() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ assignmentId, knowledgeId }: { assignmentId: number | string; knowledgeId: number | string }) =>
      completeKnowledgeLearning(assignmentId, knowledgeId),
    onSuccess: (_, variables) => {
      // Invalidate the specific assignment to refresh progress
      queryClient.invalidateQueries({ queryKey: taskKeys.assignment(variables.assignmentId) });
      // Also invalidate the list
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}
