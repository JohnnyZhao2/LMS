import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { TaskDetail } from '@/types/api';

/**
 * 获取任务详情
 */
export const useTaskDetail = (id: number) => {
  return useQuery({
    queryKey: ['task-detail', id],
    queryFn: () => apiClient.get<TaskDetail>(`/tasks/${id}/`),
    enabled: !!id,
  });
};

/**
 * 获取学员任务详情
 */
export const useStudentTaskDetail = (id: number) => {
  return useQuery({
    queryKey: ['student-task-detail', id],
    queryFn: () => apiClient.get<TaskDetail>(`/analytics/task-center/${id}/`),
    enabled: !!id,
  });
};


