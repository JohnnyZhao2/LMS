import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { buildPaginationParams, buildQueryString } from '@/lib/api-utils';
import { queryKeys } from '@/lib/query-keys';
import type { PaginatedResponse } from '@/types/common';
import type { TaskListItem } from '@/types/task';

interface GetTasksParams {
  page?: number;
  pageSize?: number;
  search?: string;
  taskStatus?: 'open' | 'closed' | 'all';
  creatorSide?: 'all' | 'management' | 'non_management';
}

export const getTasks = ({
  page = 1,
  pageSize = 20,
  search = '',
  taskStatus = 'all',
  creatorSide = 'all',
}: GetTasksParams = {}) =>
  apiClient.get<PaginatedResponse<TaskListItem>>(
    `/tasks/${buildQueryString({
      ...buildPaginationParams(page, pageSize),
      ...(search && { search }),
      ...(taskStatus !== 'all' && { status: taskStatus }),
      ...(creatorSide !== 'all' && { creator_side: creatorSide }),
    })}`,
  );

export const useTaskList = (
  params: GetTasksParams = {},
  options: { enabled?: boolean } = {},
) => {
  const currentRole = useCurrentRole();
  const { page = 1, pageSize = 20, search = '', taskStatus = 'all', creatorSide = 'all' } =
    params;
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.tasks.list({
      currentRole,
      page,
      pageSize,
      search,
      taskStatus,
      creatorSide,
    }),
    queryFn: () => getTasks({ page, pageSize, search, taskStatus, creatorSide }),
    enabled: currentRole !== null && enabled,
  });
};
