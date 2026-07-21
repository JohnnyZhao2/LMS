import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterSpotCheckMutation } from '@/lib/cache-invalidation/spot-checks';
import type { SpotCheck, SpotCheckScoreRequest } from '@/features/spot-checks/types/spot-check';

export const scoreSpotCheck = ({ id, data }: { id: number; data: SpotCheckScoreRequest }) =>
  apiClient.post<SpotCheck>(`/spot-checks/${id}/score/`, data);

export const useScoreSpotCheck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: scoreSpotCheck,
    onSuccess: () => invalidateAfterSpotCheckMutation(queryClient),
  });
};
