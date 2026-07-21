import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterSpotCheckMutation } from '@/lib/cache-invalidation/spot-checks';
import type { SpotCheck, SpotCheckCreateRequest } from '@/features/spot-checks/types/spot-check';

export const createSpotCheck = (data: SpotCheckCreateRequest) =>
  apiClient.post<SpotCheck[]>('/spot-checks/', data);

export const useCreateSpotCheck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSpotCheck,
    onSuccess: () => invalidateAfterSpotCheckMutation(queryClient),
  });
};
