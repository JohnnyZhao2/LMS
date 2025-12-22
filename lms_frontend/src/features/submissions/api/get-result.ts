import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PracticeResult } from '@/types/api';

interface UseResultOptions {
  enabled?: boolean;
}

/**
 * 获取练习结果
 */

export const usePracticeResult = (submissionId?: number, options?: UseResultOptions) => {
  return useQuery({
    queryKey: ['practice-result', submissionId],
    queryFn: () => apiClient.get<PracticeResult>(`/submissions/${submissionId!}/result/`),
    enabled: Boolean(submissionId) && (options?.enabled ?? true),
  });
};

/**
 * 获取考试结果
 */
export const useExamResult = (submissionId?: number, options?: UseResultOptions) => {
  return useQuery({
    queryKey: ['exam-result', submissionId],
    queryFn: () => apiClient.get<PracticeResult>(`/submissions/exam/${submissionId!}/result/`),
    enabled: Boolean(submissionId) && (options?.enabled ?? true),
  });
};


