import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { GradeAnswerRequest, GradingDetail } from '@/types/api';

/**
 * 提交评分
 */
export const useSubmitGrade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ submissionId, data }: { submissionId: number; data: GradeAnswerRequest }) =>
      apiClient.post<GradingDetail>(`/grading/${submissionId}/grade/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-grading'] });
      queryClient.invalidateQueries({ queryKey: ['grading-detail'] });
    },
  });
};

/**
 * 批量评分
 */
export const useBatchGrade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { submissions: { submission_id: number; grades: GradeAnswerRequest[] }[] }) =>
      apiClient.post('/grading/batch-grade/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-grading'] });
    },
  });
};


