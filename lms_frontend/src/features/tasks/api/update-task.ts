import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterTaskMutation } from '@/lib/cache-invalidation';
import type { TaskDetail } from '@/types/task';

/**
 * 更新任务请求
 */
export interface TaskQuizPassScoreUpdate {
  task_quiz_id: number;
  pass_score: number;
}

export interface TaskUpdateRequest {
  title?: string;
  description?: string;
  deadline?: string;
  quiz_pass_scores?: TaskQuizPassScoreUpdate[];
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
    onSuccess: () => invalidateAfterTaskMutation(queryClient),
    onError: () => undefined,
  });
};
