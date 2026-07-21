import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterActivityLogDeletion } from '@/lib/cache-invalidation/activity-logs';

export const bulkDeleteActivityLogs = (logItemIds: string[]) =>
  apiClient.post<{ deleted_count: number }>('/logs/items/bulk-delete/', {
    item_ids: logItemIds,
  });

export const useBulkDeleteActivityLogs = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bulkDeleteActivityLogs,
    onSuccess: () => invalidateAfterActivityLogDeletion(queryClient),
  });
};
