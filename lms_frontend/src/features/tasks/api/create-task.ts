import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  ExamTaskCreateRequest,
  LearningTaskCreateRequest,
  PracticeTaskCreateRequest,
  TaskDetail,
} from '@/types/api';

export type CreateTaskPayload =
  | { type: 'LEARNING'; data: LearningTaskCreateRequest }
  | { type: 'PRACTICE'; data: PracticeTaskCreateRequest }
  | { type: 'EXAM'; data: ExamTaskCreateRequest };

/**
 * 创建任务
 */
export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => {
      switch (payload.type) {
        case 'LEARNING':
          return apiClient.post<TaskDetail>('/tasks/learning/', payload.data);
        case 'PRACTICE':
          return apiClient.post<TaskDetail>('/tasks/practice/', payload.data);
        case 'EXAM':
          return apiClient.post<TaskDetail>('/tasks/exam/', payload.data);
        default:
          throw new Error('Unsupported task type');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['student-tasks'] });
    },
  });
};


