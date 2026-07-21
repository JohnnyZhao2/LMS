import { useQuery } from '@tanstack/react-query';

import type {
  ActivityLogListResponse,
  ActivityLogsQuery,
} from '@/features/activity-logs/types';
import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';
import { queryKeys } from '@/lib/query-keys';

export const getActivityLogs = (params: ActivityLogsQuery) =>
  apiClient.get<ActivityLogListResponse>(
    `/logs/${buildQueryString({
      type: params.type,
      page: params.page,
      page_size: params.pageSize,
      member_ids: params.memberIds?.length ? params.memberIds.join(',') : undefined,
      search: params.search,
      date_from: params.dateFrom,
      date_to: params.dateTo,
      status: params.status,
    })}`,
  );

export const useActivityLogs = (params: ActivityLogsQuery, enabled = true) =>
  useQuery({
    queryKey: queryKeys.activityLogs.list(params),
    queryFn: () => getActivityLogs(params),
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });
