import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { AddQuestionsToQuizRequest, QuizDetail } from '@/types/api';

/**
 * 添加题目到试卷
 */
export const useAddQuestionsToQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quizId, data }: { quizId: number; data: AddQuestionsToQuizRequest }) =>
      apiClient.post<QuizDetail>(`/quizzes/${quizId}/add-questions/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-detail'] });
    },
  });
};

/**
 * 从试卷移除题目
 */
export const useRemoveQuestionsFromQuiz = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quizId, questionIds }: { quizId: number; questionIds: number[] }) =>
      apiClient.post(`/quizzes/${quizId}/remove-questions/`, { question_ids: questionIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-detail'] });
    },
  });
};


