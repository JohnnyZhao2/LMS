import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { StudentLearningTaskDetail, TaskDetail } from '@/types/task';

interface UseTaskDetailOptions {
  enabled?: boolean;
}

/**
 * 获取任务详情
 */
export const useTaskDetail = (id: number, options: UseTaskDetailOptions = {}) => {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.tasks.detail({ id }),
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
    queryKey: queryKeys.tasks.studentLearningDetail({ taskId }),
    queryFn: () => apiClient.get<StudentLearningTaskDetail>(`/tasks/${taskId}/detail/`),
    enabled: Boolean(taskId) && enabled,
  });
};
