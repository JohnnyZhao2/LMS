import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { StudentLearningTaskDetail, TaskDetail } from '@/types/api';

interface UseTaskDetailOptions {
  enabled?: boolean;
}

/**
 * 获取任务详情
 */
export const useTaskDetail = (id: number, options: UseTaskDetailOptions = {}) => {
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['task-detail', id],
    queryFn: () => apiClient.get<TaskDetail>(`/tasks/${id}/`),
    enabled: Boolean(id) && enabled,
  });
};

/**
 * 获取学员学习任务详情（含知识学习进度）
 */
export const useStudentLearningTaskDetail = (
  taskId: number,
  options: UseTaskDetailOptions = {}
) => {
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['student-learning-task-detail', taskId],
    queryFn: () => apiClient.get<StudentLearningTaskDetail>(`/tasks/${taskId}/learning-detail/`),
    enabled: Boolean(taskId) && enabled,
  });
};

