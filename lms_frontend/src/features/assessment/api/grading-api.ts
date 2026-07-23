import { apiClient } from '@/lib/api-client';
import type {
  GradingAnswerResponse,
  GradingQuestion,
  GradingSubmitRequest,
} from '@/types/task-analytics';

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

export const getPendingGrading = () =>
  apiClient.get<PendingTask[]>('/grading/pending/');

export const getGradingQuestions = (taskId: number, quizId: number | null) =>
  apiClient.get<GradingQuestion[]>(`/grading/tasks/${taskId}/questions/?quiz_id=${quizId}`);

export const getGradingAnswers = (
  taskId: number,
  questionId: number | null,
  quizId: number | null,
) =>
  apiClient.get<GradingAnswerResponse>(
    `/grading/tasks/${taskId}/answers/?question_id=${questionId}&quiz_id=${quizId}`,
  );

export const submitGrading = (taskId: number, data: GradingSubmitRequest) =>
  apiClient.post<void>(`/grading/tasks/${taskId}/submit/`, data);
