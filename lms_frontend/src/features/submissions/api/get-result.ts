import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PracticeResult } from '@/types/api';

/**
 * 获取练习结果
 */
export const usePracticeResult = (assignmentId: number) => {
  return useQuery({
    queryKey: ['practice-result', assignmentId],
    queryFn: () => apiClient.get<PracticeResult>(`/submissions/practice/${assignmentId}/result/`),
    enabled: !!assignmentId,
  });
};

/**
 * 获取考试结果
 */
export const useExamResult = (assignmentId: number) => {
  return useQuery({
    queryKey: ['exam-result', assignmentId],
    queryFn: () => apiClient.get<PracticeResult>(`/submissions/exam/${assignmentId}/result/`),
    enabled: !!assignmentId,
  });
};


