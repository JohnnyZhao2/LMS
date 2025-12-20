import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SpotCheckCreateRequest, SpotCheck } from '@/types/api';

/**
 * 创建抽查记录
 */
export const useCreateSpotCheck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SpotCheckCreateRequest) => apiClient.post<SpotCheck>('/spot-checks/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spot-checks'] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spot-checks'] });
      queryClient.invalidateQueries({ queryKey: ['spot-check-detail'] });
    },
  });
};


