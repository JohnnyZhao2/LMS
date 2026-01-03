import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { buildQueryString, buildPaginationParams } from '@/lib/api-utils';
import type { GradingList, PaginatedResponse } from '@/types/api';

interface GetPendingGradingParams {
  page?: number;
  pageSize?: number;
}

/**
 * 获取待评分列表
 */
export const usePendingGrading = (params: GetPendingGradingParams = {}) => {
  const { page = 1, pageSize = 20 } = params;
  
  return useQuery({
    queryKey: ['pending-grading', page, pageSize],
    queryFn: () => {
      const queryString = buildQueryString(buildPaginationParams(page, pageSize));
      return apiClient.get<PaginatedResponse<GradingList>>(`/grading/pending/${queryString}`);
    },
  });
};


