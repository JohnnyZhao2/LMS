import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SpotCheck, PaginatedResponse } from '@/types/api';

/**
 * 获取抽查记录列表
 */
export const useSpotChecks = (page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: ['spot-checks', page, pageSize],
    queryFn: () =>
      apiClient.get<PaginatedResponse<SpotCheck>>(`/spot-checks/?page=${page}&page_size=${pageSize}`),
  });
};

/**
 * 获取抽查详情
 */
export const useSpotCheckDetail = (id: number) => {
  return useQuery({
    queryKey: ['spot-check-detail', id],
    queryFn: () => apiClient.get<SpotCheck>(`/spot-checks/${id}/`),
    enabled: !!id,
  });
};


