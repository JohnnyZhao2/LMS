import { useQuery, type QueryClient } from '@tanstack/react-query';

import {
  bulkDeleteActivityLogs,
  getActivityLogPolicies,
  getActivityLogs,
  updateActivityLogPolicy,
} from '@/features/activity-logs/api/activity-logs-api';
import type { ActivityLogsQuery } from '@/features/activity-logs/types';
import { invalidateMany } from '@/lib/react-query/invalidate-many';
import { useAppMutation } from '@/lib/react-query/use-app-mutation';

export const activityLogsQueryKeys = {
  all: () => ['activity-logs'] as const,
  list: (params: unknown) => ['activity-logs', params] as const,
  policies: () => ['activity-log-policies'] as const,
} as const;

/**
 * 批量删除活动日志后失效列表缓存。
 */
export const invalidateAfterActivityLogDeletion = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [activityLogsQueryKeys.all()]);

/**
 * 活动日志策略变更后失效策略缓存。
 */
export const invalidateAfterActivityLogPolicyMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [activityLogsQueryKeys.policies()]);

export const useActivityLogs = (params: ActivityLogsQuery, enabled = true) =>
  useQuery({
    queryKey: activityLogsQueryKeys.list(params),
    queryFn: () => getActivityLogs(params),
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
  });

export const useActivityLogPolicies = (enabled = true) =>
  useQuery({
    queryKey: activityLogsQueryKeys.policies(),
    queryFn: getActivityLogPolicies,
    enabled,
  });

export const useUpdateActivityLogPolicy = () =>
  useAppMutation(updateActivityLogPolicy, invalidateAfterActivityLogPolicyMutation);

export const useBulkDeleteActivityLogs = () =>
  useAppMutation(bulkDeleteActivityLogs, invalidateAfterActivityLogDeletion);
