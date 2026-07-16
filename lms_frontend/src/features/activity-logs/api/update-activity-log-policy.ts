import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ActivityLogPolicy } from '@/features/activity-logs/types';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterActivityLogPolicyMutation } from '@/lib/cache-invalidation/activity-logs';

export const updateActivityLogPolicy = (payload: { key: string; enabled: boolean }) =>
  apiClient.patch<ActivityLogPolicy>('/logs/policies/', payload);

export const useUpdateActivityLogPolicy = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateActivityLogPolicy,
    onSuccess: () => invalidateAfterActivityLogPolicyMutation(queryClient),
  });
};
