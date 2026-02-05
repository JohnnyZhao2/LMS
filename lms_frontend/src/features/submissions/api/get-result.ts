import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { PracticeResult } from '@/types/api';

interface UseResultOptions {
  enabled?: boolean;
}

/**
 * 获取练习结果
 */

export const usePracticeResult = (submissionId?: number, options?: UseResultOptions) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: ['practice-result', currentRole ?? 'UNKNOWN', submissionId],
    queryFn: () => apiClient.get<PracticeResult>(`/submissions/${submissionId!}/result/`),
    enabled: Boolean(submissionId) && currentRole !== null && (options?.enabled ?? true),
  });
};

/**
 * 获取考试结果
 */
export const useExamResult = (submissionId?: number, options?: UseResultOptions) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: ['exam-result', currentRole ?? 'UNKNOWN', submissionId],
    queryFn: () => apiClient.get<PracticeResult>(`/submissions/exam/${submissionId!}/result/`),
    enabled: Boolean(submissionId) && currentRole !== null && (options?.enabled ?? true),
  });
};
