import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  StudentTaskCenterResponse,
  TaskListItem,
  TaskType,
  TaskStatus,
} from '@/types/api';

interface GetTasksParams {
  page?: number;
  pageSize?: number;
  taskType?: TaskType;
  status?: TaskStatus;
  isClosed?: boolean;
}

interface UseTasksOptions {
  enabled?: boolean;
}

/**
 * 获取任务列表（学员视角）
 */
export const useStudentTasks = (
  params: GetTasksParams = {},
  options: UseTasksOptions = {}
) => {
  const { page = 1, pageSize = 20, taskType, status } = params;
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['student-tasks', page, pageSize, taskType, status],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (page) searchParams.set('page', String(page));
      if (pageSize) searchParams.set('page_size', String(pageSize));
      if (taskType) searchParams.set('task_type', taskType);
      if (status) searchParams.set('status', status);

      return apiClient.get<StudentTaskCenterResponse>(
        `/analytics/task-center/?${searchParams.toString()}`
      );
    },
    enabled,
  });
};

/**
 * 获取任务列表（管理视角）
 */
export const useTaskList = (
  params: GetTasksParams = {},
  options: UseTasksOptions = {}
) => {
  const { page = 1, pageSize = 20, taskType, isClosed } = params;
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['tasks', page, pageSize, taskType, isClosed],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (page) searchParams.set('page', String(page));
      if (pageSize) searchParams.set('page_size', String(pageSize));
      if (taskType) searchParams.set('task_type', taskType);
      if (typeof isClosed === 'boolean') {
        searchParams.set('is_closed', isClosed ? 'true' : 'false');
      }

      return apiClient.get<TaskListItem[]>(
        `/tasks/?${searchParams.toString()}`
      );
    },
    enabled,
  });
};


