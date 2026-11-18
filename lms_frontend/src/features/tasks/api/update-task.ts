import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiError } from '@/lib/api-client';
import { invalidateAfterTaskMutation } from '@/lib/cache-invalidation';
import type { TaskDetail } from '@/types/task';
import { showApiError } from '@/utils/error-handler';

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
  knowledge_ids?: number[];
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
    onError: (error: Error) => {
      if (error instanceof ApiError && error.code === 'INVALID_OPERATION') {
        showApiError(error);
      }
    },
  });
};
