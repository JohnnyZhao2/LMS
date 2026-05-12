import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterGradingMutation } from '@/lib/cache-invalidation';
import { queryKeys } from '@/lib/query-keys';
import { useCurrentRole } from '@/session/hooks/use-current-role';
import type { TaskAnalytics, StudentExecution, GradingQuestion, GradingAnswerResponse, GradingSubmitRequest } from '@/types/task-analytics';

interface SubmitGradingOptions {
  beforeInvalidate?: (variables: GradingSubmitRequest) => void | Promise<void>;
  afterInvalidate?: (variables: GradingSubmitRequest) => void;
}

/**
 * 获取任务分析数据
 */
export const useTaskAnalytics = (taskId: number, options: { enabled?: boolean } = {}) => {
  const currentRole = useCurrentRole();
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.grading.taskAnalytics({ currentRole, taskId }),
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
    queryKey: queryKeys.grading.studentExecutions({ currentRole, taskId }),
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
    queryKey: queryKeys.grading.questions({ currentRole, taskId, quizId }),
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
  studentId: number | null = null,
  options: { enabled?: boolean } = {}
) => {
  const currentRole = useCurrentRole();
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.grading.answers({ currentRole, taskId, quizId, questionId, studentId }),
    queryFn: () => {
      const searchParams = new URLSearchParams({
        question_id: String(questionId),
        quiz_id: String(quizId),
      });
      if (studentId !== null) {
        searchParams.set('student_id', String(studentId));
      }
      return apiClient.get<GradingAnswerResponse>(
        `/grading/tasks/${taskId}/answers/?${searchParams.toString()}`
      );
    },
    enabled: Boolean(taskId) && Boolean(quizId) && Boolean(questionId) && currentRole !== null && enabled,
  });
};

/**
 * 提交评分
 */
export const useSubmitGrading = (taskId: number, options: SubmitGradingOptions = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GradingSubmitRequest) =>
      apiClient.post<void>(`/grading/tasks/${taskId}/submit/`, data),
    onSuccess: async (_data, variables) => {
      await options.beforeInvalidate?.(variables);
      await invalidateAfterGradingMutation(queryClient);
      options.afterInvalidate?.(variables);
    },
  });
};
