import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { buildPaginationParams, buildQueryString } from '@/lib/api-utils';
import { queryKeys } from '@/lib/query-keys';
import type { TaskStatus } from '@/types/common';
import type { StudentTaskCenterResponse } from '@/types/task';

interface GetStudentTasksParams {
  page?: number;
  pageSize?: number;
  status?: TaskStatus;
  search?: string;
}

export const getStudentTasks = ({
  page = 1,
  pageSize = 20,
  status,
  search = '',
}: GetStudentTasksParams = {}) =>
  apiClient.get<StudentTaskCenterResponse>(
    `/tasks/my-assignments/${buildQueryString({
      ...buildPaginationParams(page, pageSize),
      ...(status && { status }),
      ...(search && { search }),
    })}`,
  );

export const useStudentTasks = (
  params: GetStudentTasksParams = {},
  options: { enabled?: boolean } = {},
) => {
  const currentRole = useCurrentRole();
  const { page = 1, pageSize = 20, status, search = '' } = params;
  const { enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.tasks.studentList({ currentRole, page, pageSize, status, search }),
    queryFn: () => getStudentTasks({ page, pageSize, status, search }),
    enabled: currentRole !== null && enabled,
    placeholderData: keepPreviousData,
  });
};
