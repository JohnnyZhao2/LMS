import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { GradingDetail } from '@/types/api';

/**
 * 获取评分详情
 */
export const useGradingDetail = (submissionId: number) => {
  return useQuery({
    queryKey: ['grading-detail', submissionId],
    queryFn: () => apiClient.get<GradingDetail>(`/grading/${submissionId}/`),
    enabled: !!submissionId,
  });
};


