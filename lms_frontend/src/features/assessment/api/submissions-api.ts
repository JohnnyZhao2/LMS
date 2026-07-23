import type {
  PracticeResult,
  SaveAnswerRequest,
  SubmissionDetail,
} from '@/features/assessment/types/submission';
import { apiClient } from '@/lib/api-client';

export interface StartQuizPayload {
  assignmentId: number;
  quizId: number;
}

export interface SaveAnswerParams {
  submissionId: number;
  data: SaveAnswerRequest;
}

export const startQuiz = ({ assignmentId, quizId }: StartQuizPayload) =>
  apiClient.post<SubmissionDetail>('/submissions/start/', {
    assignment_id: assignmentId,
    quiz_id: quizId,
  });

export const saveAnswer = ({ submissionId, data }: SaveAnswerParams) =>
  apiClient.post(`/submissions/${submissionId}/save-answer/`, data);

export const submitQuiz = (submissionId: number) =>
  apiClient.post<SubmissionDetail>(`/submissions/${submissionId}/submit/`);

export const getSubmissionResult = (submissionId: number) =>
  apiClient.get<PracticeResult>(`/submissions/${submissionId}/result/`);
