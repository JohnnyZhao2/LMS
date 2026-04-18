import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString, buildPaginationParams } from '@/lib/api-utils';
import { useCurrentRole } from '@/session/hooks/use-current-role';
import type { PaginatedResponse, TaskStatus } from '@/types/common';
import type { StudentTaskCenterResponse, TaskListItem } from '@/types/task';

interface GetTasksParams {
  page?: number;
  pageSize?: number;
  status?: TaskStatus;
  search?: string;
  taskStatus?: 'open' | 'closed' | 'all';
  creatorSide?: 'all' | 'management' | 'non_management';
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
  const { page = 1, pageSize = 20, status, search = '' } = params;
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['student-tasks', currentRole ?? 'UNKNOWN', page, pageSize, status, search],
    queryFn: () => {
      const queryParams = {
        ...buildPaginationParams(page, pageSize),
        ...(status && { status }),
        ...(search && { search }),
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
  const { page = 1, pageSize = 20, search = '', taskStatus = 'all', creatorSide = 'all' } = params;
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['tasks', currentRole ?? 'UNKNOWN', page, pageSize, search, taskStatus, creatorSide],
    queryFn: () => {
      const queryParams = {
        ...buildPaginationParams(page, pageSize),
        ...(search && { search }),
        ...(taskStatus !== 'all' && { status: taskStatus }),
        ...(creatorSide !== 'all' && { creator_side: creatorSide }),
      };
      const queryString = buildQueryString(queryParams);
      return apiClient.get<PaginatedResponse<TaskListItem>>(
        `/tasks/${queryString}`
      );
    },
    enabled: currentRole !== null && enabled,
  });
};
