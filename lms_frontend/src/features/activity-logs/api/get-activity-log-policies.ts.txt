import { useQuery } from '@tanstack/react-query';

import type { ActivityLogPolicy } from '@/features/activity-logs/types';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export const getActivityLogPolicies = () =>
  apiClient.get<ActivityLogPolicy[]>('/logs/policies/');

export const useActivityLogPolicies = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.activityLogs.policies(),
    queryFn: getActivityLogPolicies,
    enabled,
  });
