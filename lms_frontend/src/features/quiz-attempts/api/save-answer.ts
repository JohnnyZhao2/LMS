import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { SaveAnswerRequest } from '@/features/quiz-attempts/types';

export interface SaveAnswerParams {
  submissionId: number;
  data: { answers: SaveAnswerRequest[] };
  keepalive?: boolean;
}

export const saveQuizAnswers = (
  submissionId: number,
  data: { answers: SaveAnswerRequest[] },
  options?: { keepalive?: boolean },
) =>
  apiClient.post(
    `/submissions/${submissionId}/save-answer/`,
    data,
    options?.keepalive ? { keepalive: true } : undefined,
  );

/**
 * 保存答案
 */
export const useSaveAnswer = () => {
  return useMutation({
    mutationFn: ({ submissionId, data, keepalive }: SaveAnswerParams) =>
      saveQuizAnswers(submissionId, data, { keepalive }),
    onError: () => undefined,
  });
};
