import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString, buildPaginationParams } from '@/lib/api-utils';
import type { SpotCheck, PaginatedResponse } from '@/types/api';

interface GetSpotChecksParams {
  page?: number;
  pageSize?: number;
}

/**
 * 获取抽查记录列表
 */
export const useSpotChecks = (params: GetSpotChecksParams = {}) => {
  const { page = 1, pageSize = 20 } = params;
  
  return useQuery({
    queryKey: ['spot-checks', page, pageSize],
    queryFn: () => {
      const queryString = buildQueryString(buildPaginationParams(page, pageSize));
      return apiClient.get<PaginatedResponse<SpotCheck>>(`/spot-checks/${queryString}`);
    },
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


