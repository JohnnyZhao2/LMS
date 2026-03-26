import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  ActivityLogListResponse,
  ActivityLogPolicy,
  ActivityLogsQuery,
} from '../types';

const buildActivityLogsQueryString = (params: ActivityLogsQuery) => {
  const query = new URLSearchParams({
    type: params.type,
    page: String(params.page),
    page_size: String(params.pageSize),
  });

  if (params.memberIds && params.memberIds.length > 0) {
    query.set('member_ids', params.memberIds.join(','));
  }
  if (params.search) {
    query.set('search', params.search);
  }
  if (params.dateFrom) {
    query.set('date_from', params.dateFrom);
  }
  if (params.dateTo) {
    query.set('date_to', params.dateTo);
  }
  if (params.action) {
    query.set('action', params.action);
  }
  if (params.status) {
    query.set('status', params.status);
  }

  return query.toString();
};

export const useActivityLogs = (params: ActivityLogsQuery, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['activity-logs', params],
    queryFn: async () => {
      const queryString = buildActivityLogsQueryString(params);
      return await apiClient.get<ActivityLogListResponse>(`/logs/?${queryString}`);
    },
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });
};

export const useActivityLogPolicies = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['activity-log-policies'],
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-log-policies'] });
    },
  });
};

export const useDeleteActivityLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (logItemId: string) => {
      return apiClient.delete<void>(`/logs/items/${logItemId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    },
  });
};
