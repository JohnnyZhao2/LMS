import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterSpotCheckMutation } from '@/lib/cache-invalidation/spot-checks';

export const deleteSpotCheck = (id: number) => apiClient.delete(`/spot-checks/${id}/`);

export const useDeleteSpotCheck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSpotCheck,
    onSuccess: () => invalidateAfterSpotCheckMutation(queryClient),
  });
};
