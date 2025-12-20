import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { GradingList, PaginatedResponse } from '@/types/api';

/**
 * 获取待评分列表
 */
export const usePendingGrading = (page = 1, pageSize = 20) => {
  return useQuery({
    queryKey: ['pending-grading', page, pageSize],
    queryFn: () =>
      apiClient.get<PaginatedResponse<GradingList>>(`/grading/pending/?page=${page}&page_size=${pageSize}`),
  });
};


