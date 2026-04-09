import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useCurrentRole } from '@/hooks/use-current-role';

export interface PendingQuiz {
  quiz_id: number;
  quiz_title: string;
  quiz_type: 'EXAM' | 'PRACTICE';
  quiz_type_display: string;
  question_count: number;
  duration: number | null;
  pending_count: number;
}

export interface PendingTask {
  task_id: number;
  task_title: string;
  deadline: string;
  quizzes: PendingQuiz[];
}

export const usePendingQuizzes = () => {
  const currentRole = useCurrentRole();

  return useQuery({
    queryKey: ['grading', 'pending', currentRole ?? 'UNKNOWN'],
    queryFn: () => apiClient.get<PendingTask[]>('/grading/pending/'),
    enabled: currentRole !== null,
  });
};
