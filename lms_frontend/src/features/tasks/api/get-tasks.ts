import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  StudentTaskCenterResponse,
  TaskListItem,
  TaskStatus,
} from '@/types/api';

interface GetTasksParams {
  page?: number;
  pageSize?: number;
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
  const { page = 1, pageSize = 20, status } = params;
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['student-tasks', page, pageSize, status],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (page) searchParams.set('page', String(page));
      if (pageSize) searchParams.set('page_size', String(pageSize));
      if (status) searchParams.set('status', status);

      return apiClient.get<StudentTaskCenterResponse>(
        `/tasks/my-assignments/?${searchParams.toString()}`
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
  const { page = 1, pageSize = 20, isClosed } = params;
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['tasks', page, pageSize, isClosed],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (page) searchParams.set('page', String(page));
      if (pageSize) searchParams.set('page_size', String(pageSize));
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
