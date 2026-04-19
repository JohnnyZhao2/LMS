import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterSpotCheckMutation } from '@/lib/cache-invalidation';
import type { SpotCheckCreateRequest, SpotCheck } from '@/types/spot-check';

/**
 * 创建抽查记录
 */
export const useCreateSpotCheck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SpotCheckCreateRequest) => apiClient.post<SpotCheck>('/spot-checks/', data),
    onSuccess: () => invalidateAfterSpotCheckMutation(queryClient),
  });
};

/**
 * 更新抽查记录
 */
export const useUpdateSpotCheck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SpotCheckCreateRequest> }) =>
      apiClient.patch<SpotCheck>(`/spot-checks/${id}/`, data),
    onSuccess: () => invalidateAfterSpotCheckMutation(queryClient),
  });
};

/**
 * 删除抽查记录
 */
export const useDeleteSpotCheck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/spot-checks/${id}/`),
    onSuccess: () => invalidateAfterSpotCheckMutation(queryClient),
  });
};
