import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterGradingMutation } from '@/lib/cache-invalidation/grading';
import type { GradingSubmitRequest } from '@/types/task-analytics';

interface SubmitGradingOptions {
  beforeInvalidate?: (variables: GradingSubmitRequest) => void | Promise<void>;
  afterInvalidate?: (variables: GradingSubmitRequest) => void;
}

export const submitGrading = (taskId: number, data: GradingSubmitRequest) =>
  apiClient.post<void>(`/grading/tasks/${taskId}/submit/`, data);

export const useSubmitGrading = (taskId: number, options: SubmitGradingOptions = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GradingSubmitRequest) => submitGrading(taskId, data),
    onSuccess: async (_data, variables) => {
      await options.beforeInvalidate?.(variables);
      await invalidateAfterGradingMutation(queryClient);
      options.afterInvalidate?.(variables);
    },
  });
};
