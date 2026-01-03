import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString, buildPaginationParams } from '@/lib/api-utils';
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
      const queryParams = {
        ...buildPaginationParams(page, pageSize),
        ...(status && { status }),
      };
      const queryString = buildQueryString(queryParams);
      return apiClient.get<StudentTaskCenterResponse>(
        `/tasks/my-assignments/${queryString}`
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
      const queryParams = {
        ...buildPaginationParams(page, pageSize),
        ...(typeof isClosed === 'boolean' && { is_closed: isClosed ? 'true' : 'false' }),
      };
      const queryString = buildQueryString(queryParams);
      return apiClient.get<TaskListItem[]>(
        `/tasks/${queryString}`
      );
    },
    enabled,
  });
};
