import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface PendingQuiz {
  quiz_id: number;
  quiz_title: string;
  quiz_type: 'EXAM' | 'PRACTICE';
  quiz_type_display: string;
  question_count: number;
  total_score: number;
  duration: number | null;
  pending_count: number;
  total_count: number;
}

export interface PendingTask {
  task_id: number;
  task_title: string;
  deadline: string;
  quizzes: PendingQuiz[];
}

interface PendingQuizzesParams {
  quiz_type?: 'EXAM' | 'PRACTICE';
}

export const usePendingQuizzes = (params?: PendingQuizzesParams) => {
  return useQuery({
    queryKey: ['grading', 'pending', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.quiz_type) {
        searchParams.set('quiz_type', params.quiz_type);
      }
      const url = `/grading/pending/${searchParams.toString() ? `?${searchParams}` : ''}`;
      return apiClient.get<PendingTask[]>(url);
    },
  });
};
