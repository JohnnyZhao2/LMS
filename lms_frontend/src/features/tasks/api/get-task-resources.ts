import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { buildQueryString } from '@/lib/api-utils';
import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@/types/common';
import type { TaskResourceOption } from '@/types/task';

interface UseTaskResourceOptions {
  search?: string;
  page?: number;
  page_size?: number;
  resource_type?: 'ALL' | 'DOCUMENT' | 'QUIZ';
  exclude_document_ids?: number[];
  exclude_quiz_ids?: number[];
  enabled?: boolean;
}

export const useTaskResourceOptions = (options: UseTaskResourceOptions = {}) => {
  const currentRole = useCurrentRole();
  const {
    search = '',
    page = 1,
    page_size = 10,
    resource_type = 'ALL',
    exclude_document_ids = [],
    exclude_quiz_ids = [],
    enabled = true,
  } = options;
  const excludeDocumentIds = exclude_document_ids.join(',');
  const excludeQuizIds = exclude_quiz_ids.join(',');

  return useQuery({
    queryKey: ['task-resource-options', currentRole ?? 'UNKNOWN', resource_type, search, page, page_size, excludeDocumentIds, excludeQuizIds],
    queryFn: () => {
      const queryString = buildQueryString({
        resource_type,
        page: String(page),
        page_size: String(page_size),
        ...(search && { search }),
        ...(excludeDocumentIds && { exclude_document_ids: excludeDocumentIds }),
        ...(excludeQuizIds && { exclude_quiz_ids: excludeQuizIds }),
      });
      return apiClient.get<PaginatedResponse<TaskResourceOption>>(`/tasks/resource-options/${queryString}`);
    },
    enabled: currentRole !== null && enabled,
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  });
};
