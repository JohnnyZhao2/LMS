import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterSpotCheckMutation } from '@/lib/cache-invalidation/spot-checks';
import type { SpotCheck, SpotCheckSubmitRequest } from '@/features/spot-checks/types/spot-check';

export const submitSpotCheck = ({ id, data }: { id: number; data: SpotCheckSubmitRequest }) =>
  apiClient.post<SpotCheck>(`/spot-checks/${id}/submit/`, data);

export const useSubmitSpotCheck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitSpotCheck,
    onSuccess: () => invalidateAfterSpotCheckMutation(queryClient),
  });
};
