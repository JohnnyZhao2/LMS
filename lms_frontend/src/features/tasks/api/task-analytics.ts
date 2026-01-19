import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  TaskAnalytics,
  StudentExecution,
  GradingQuestion,
  GradingAnswer,
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
export const useGradingQuestions = (taskId: number, options: { enabled?: boolean } = {}) => {
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['grading-questions', taskId],
    queryFn: () => apiClient.get<GradingQuestion[]>(`/tasks/${taskId}/grading/questions/`),
    enabled: Boolean(taskId) && enabled,
  });
};

/**
 * 获取学员答案列表
 */
export const useGradingAnswers = (
  taskId: number,
  questionId: number | null,
  options: { enabled?: boolean } = {}
) => {
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['grading-answers', taskId, questionId],
    queryFn: () =>
      apiClient.get<GradingAnswer[]>(`/tasks/${taskId}/grading/answers/?question_id=${questionId}`),
    enabled: Boolean(taskId) && Boolean(questionId) && enabled,
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
