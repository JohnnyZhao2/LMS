import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { StudentTaskCenterList, TaskType, TaskStatus } from '@/types/api';

interface GetTasksParams {
  page?: number;
  pageSize?: number;
  taskType?: TaskType;
  status?: TaskStatus;
}

/**
 * 获取任务列表（学员视角）
 */
export const useStudentTasks = (params: GetTasksParams = {}) => {
  const { page = 1, pageSize = 20, taskType, status } = params;

  return useQuery({
    queryKey: ['student-tasks', page, pageSize, taskType, status],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (page) searchParams.set('page', String(page));
      if (pageSize) searchParams.set('page_size', String(pageSize));
      if (taskType) searchParams.set('task_type', taskType);
      if (status) searchParams.set('status', status);

      return apiClient.get<StudentTaskCenterList[]>(`/analytics/task-center/?${searchParams.toString()}`);
    },
  });
};

/**
 * 获取任务列表（管理视角）
 */
export const useTaskList = (params: GetTasksParams = {}) => {
  const { page = 1, pageSize = 20, taskType, status } = params;

  return useQuery({
    queryKey: ['tasks', page, pageSize, taskType, status],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (page) searchParams.set('page', String(page));
      if (pageSize) searchParams.set('page_size', String(pageSize));
      if (taskType) searchParams.set('task_type', taskType);
      if (status) searchParams.set('status', status);

      return apiClient.get<StudentTaskCenterList[]>(`/tasks/?${searchParams.toString()}`);
    },
  });
};


