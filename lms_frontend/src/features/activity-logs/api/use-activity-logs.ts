import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';
import {
  invalidateAfterActivityLogDeletion,
  invalidateAfterActivityLogPolicyMutation,
} from '@/lib/cache-invalidation';
import { queryKeys } from '@/lib/query-keys';
import type {
  ActivityLogListResponse,
  ActivityLogPolicy,
  ActivityLogsQuery,
} from '../types';

export const useActivityLogs = (params: ActivityLogsQuery, enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.activityLogs.list(params),
    queryFn: async () => {
      const queryString = buildQueryString({
        type: params.type,
        page: params.page,
        page_size: params.pageSize,
        member_ids: params.memberIds?.length ? params.memberIds.join(',') : undefined,
        search: params.search,
        date_from: params.dateFrom,
        date_to: params.dateTo,
        status: params.status,
      });
      return await apiClient.get<ActivityLogListResponse>(`/logs/${queryString}`);
    },
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });
};

export const useActivityLogPolicies = (enabled: boolean = true) => {
  return useQuery({
    queryKey: queryKeys.activityLogs.policies(),
    queryFn: async () => {
      return await apiClient.get<ActivityLogPolicy[]>(`/logs/policies/`);
    },
    enabled,
  });
};

export const useUpdateActivityLogPolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { key: string; enabled: boolean }) => {
      return apiClient.patch<ActivityLogPolicy>(`/logs/policies/`, payload);
    },
    onSuccess: () => invalidateAfterActivityLogPolicyMutation(queryClient),
  });
};

export const useBulkDeleteActivityLogs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (logItemIds: string[]) => {
      return apiClient.post<{ deleted_count: number }>(`/logs/items/bulk-delete/`, {
        item_ids: logItemIds,
      });
    },
    onSuccess: () => invalidateAfterActivityLogDeletion(queryClient),
  });
};
