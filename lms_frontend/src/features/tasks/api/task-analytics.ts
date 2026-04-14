import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useCurrentRole } from '@/hooks/use-current-role';
import type { TaskAnalytics, StudentExecution, GradingQuestion, GradingAnswerResponse, GradingSubmitRequest } from '@/types/task-analytics';

/**
 * 获取任务分析数据
 */
export const useTaskAnalytics = (taskId: number, options: { enabled?: boolean } = {}) => {
  const currentRole = useCurrentRole();
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['task-analytics', currentRole ?? 'UNKNOWN', taskId],
    queryFn: () => apiClient.get<TaskAnalytics>(`/tasks/${taskId}/analytics/`),
    enabled: Boolean(taskId) && currentRole !== null && enabled,
  });
};

/**
 * 获取学员执行情况
 */
export const useStudentExecutions = (taskId: number, options: { enabled?: boolean } = {}) => {
  const currentRole = useCurrentRole();
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['student-executions', currentRole ?? 'UNKNOWN', taskId],
    queryFn: () => apiClient.get<StudentExecution[]>(`/tasks/${taskId}/student-executions/`),
    enabled: Boolean(taskId) && currentRole !== null && enabled,
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
  const currentRole = useCurrentRole();
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['grading-questions', currentRole ?? 'UNKNOWN', taskId, quizId],
    queryFn: () => apiClient.get<GradingQuestion[]>(`/grading/tasks/${taskId}/questions/?quiz_id=${quizId}`),
    enabled: Boolean(taskId) && Boolean(quizId) && currentRole !== null && enabled,
    placeholderData: keepPreviousData,
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
  const currentRole = useCurrentRole();
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['grading-answers', currentRole ?? 'UNKNOWN', taskId, quizId, questionId],
    queryFn: () =>
      apiClient.get<GradingAnswerResponse>(
        `/grading/tasks/${taskId}/answers/?question_id=${questionId}&quiz_id=${quizId}`
      ),
    enabled: Boolean(taskId) && Boolean(quizId) && Boolean(questionId) && currentRole !== null && enabled,
  });
};

/**
 * 提交评分
 */
export const useSubmitGrading = (taskId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GradingSubmitRequest) =>
      apiClient.post(`/grading/tasks/${taskId}/submit/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grading-answers'] });
      queryClient.invalidateQueries({ queryKey: ['grading-questions'] });
      queryClient.invalidateQueries({ queryKey: ['grading', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['task-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['student-executions'] });
    },
  });
};
