import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  TaskAnalytics,
  StudentExecution,
  GradingQuestion,
  GradingAnswerResponse,
  GradingSubmitRequest,
} from '@/types/api';

/**
 * 获取任务分析数据
 */
export const useTaskAnalytics = (taskId: number, options: { enabled?: boolean } = {}) => {
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['task-analytics', taskId],
    queryFn: () => apiClient.get<TaskAnalytics>(`/tasks/${taskId}/analytics/`),
    enabled: Boolean(taskId) && enabled,
  });
};

/**
 * 获取学员执行情况
 */
export const useStudentExecutions = (taskId: number, options: { enabled?: boolean } = {}) => {
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['student-executions', taskId],
    queryFn: () => apiClient.get<StudentExecution[]>(`/tasks/${taskId}/student-executions/`),
    enabled: Boolean(taskId) && enabled,
  });
};

/**
 * 获取待评分简答题列表
 */
export const useGradingQuestions = (
  taskId: number,
  quizId: number | null,
  options: { enabled?: boolean } = {}
) => {
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['grading-questions', taskId, quizId],
    queryFn: () => apiClient.get<GradingQuestion[]>(`/tasks/${taskId}/grading/questions/?quiz_id=${quizId}`),
    enabled: Boolean(taskId) && Boolean(quizId) && enabled,
  });
};

/**
 * 获取学员答案列表
 */
export const useGradingAnswers = (
  taskId: number,
  questionId: number | null,
  quizId: number | null,
  options: { enabled?: boolean } = {}
) => {
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['grading-answers', taskId, quizId, questionId],
    queryFn: () =>
      apiClient.get<GradingAnswerResponse>(
        `/tasks/${taskId}/grading/answers/?question_id=${questionId}&quiz_id=${quizId}`
      ),
    enabled: Boolean(taskId) && Boolean(quizId) && Boolean(questionId) && enabled,
  });
};

/**
 * 提交评分
 */
export const useSubmitGrading = (taskId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GradingSubmitRequest) =>
      apiClient.post(`/tasks/${taskId}/grading/submit/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grading-answers', taskId] });
      queryClient.invalidateQueries({ queryKey: ['grading-questions', taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-analytics', taskId] });
      queryClient.invalidateQueries({ queryKey: ['student-executions', taskId] });
    },
  });
};
