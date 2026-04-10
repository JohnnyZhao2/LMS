import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { buildQueryString } from '@/lib/api-utils';
import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse, TaskResourceOption } from '@/types/api';

interface UseTaskResourceOptions {
  search?: string;
  page?: number;
  page_size?: number;
  resource_type?: 'ALL' | 'DOCUMENT' | 'QUIZ';
  enabled?: boolean;
}

export const useTaskResourceOptions = (options: UseTaskResourceOptions = {}) => {
  const currentRole = useCurrentRole();
  const {
    search = '',
    page = 1,
    page_size = 10,
    resource_type = 'ALL',
    enabled = true,
  } = options;

  return useQuery({
    queryKey: ['task-resource-options', currentRole ?? 'UNKNOWN', resource_type, search, page, page_size],
    queryFn: () => {
      const queryString = buildQueryString({
        resource_type,
        page: String(page),
        page_size: String(page_size),
        ...(search && { search }),
      });
      return apiClient.get<PaginatedResponse<TaskResourceOption>>(`/tasks/resource-options/${queryString}`);
    },
    enabled: currentRole !== null && enabled,
    staleTime: 60_000,
  });
};
