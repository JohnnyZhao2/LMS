import type {
  ActivityLogListResponse,
  ActivityLogPolicy,
  ActivityLogsQuery,
} from '@/features/activity-logs/types';
import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';

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

export const getActivityLogPolicies = () =>
  apiClient.get<ActivityLogPolicy[]>('/logs/policies/');

export const updateActivityLogPolicy = (payload: { key: string; enabled: boolean }) =>
  apiClient.patch<ActivityLogPolicy>('/logs/policies/', payload);

export const bulkDeleteActivityLogs = (logItemIds: string[]) =>
  apiClient.post<{ deleted_count: number }>('/logs/items/bulk-delete/', {
    item_ids: logItemIds,
  });
