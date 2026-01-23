import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString, buildPaginationParams } from '@/lib/api-utils';
import { useCurrentRole } from '@/hooks/use-current-role';
import type {
  PaginatedResponse,
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
  const currentRole = useCurrentRole();
  const { page = 1, pageSize = 20, status } = params;
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['student-tasks', currentRole ?? 'UNKNOWN', page, pageSize, status],
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
    enabled: currentRole !== null && enabled,
    placeholderData: keepPreviousData,
  });
};

/**
 * 获取任务列表（管理视角）
 */
export const useTaskList = (
  params: GetTasksParams = {},
  options: UseTasksOptions = {}
) => {
  const currentRole = useCurrentRole();
  const { page = 1, pageSize = 20, isClosed } = params;
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['tasks', currentRole ?? 'UNKNOWN', page, pageSize, isClosed],
    queryFn: () => {
      const queryParams = {
        ...buildPaginationParams(page, pageSize),
        ...(typeof isClosed === 'boolean' && { is_closed: isClosed ? 'true' : 'false' }),
      };
      const queryString = buildQueryString(queryParams);
      return apiClient.get<PaginatedResponse<TaskListItem>>(
        `/tasks/${queryString}`
      );
    },
    enabled: currentRole !== null && enabled,
  });
};
