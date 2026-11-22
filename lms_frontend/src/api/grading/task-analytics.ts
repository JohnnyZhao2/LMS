import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterGradingMutation } from '@/lib/cache-invalidation';
import { queryKeys } from '@/lib/query-keys';
import type {
  TaskAnalytics,
  TaskNodeCategory,
  StudentExecution,
  GradingQuestion,
  GradingAnswerResponse,
  GradingSubmitRequest,
} from '@/types/task-analytics';

/**
 * 获取任务分析数据
 */
export const useTaskAnalytics = (taskId: number, options: { enabled?: boolean } = {}) => {
  const { enabled = true } = options;
  return useQuery({
    queryKey: queryKeys.grading.taskAnalytics({ taskId }),
    queryFn: () => apiClient.get<TaskAnalytics>(`/tasks/${taskId}/analytics/`),
    enabled: Boolean(taskId) && enabled,
  });
};

/**
 * 获取节点下学员执行情况
 */
export const useStudentExecutions = (
  taskId: number,
  nodeType: TaskNodeCategory | null = null,
  nodeId: number | null = null,
  options: { enabled?: boolean } = {}
) => {
  const { enabled = true } = options;
  const hasSelectedNode = Boolean(nodeType) && Boolean(nodeId);
  return useQuery({
    queryKey: queryKeys.grading.studentExecutions({ taskId, nodeType, nodeId }),
    queryFn: () => {
      const search = new URLSearchParams();
      if (nodeType && nodeId) {
        search.set('node_type', nodeType);
        search.set('node_id', String(nodeId));
      }
      const queryString = search.toString();
      return apiClient.get<StudentExecution[]>(
        `/tasks/${taskId}/student-executions/${queryString ? `?${queryString}` : ''}`
      );
    },
    enabled: Boolean(taskId) && hasSelectedNode && enabled,
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
    queryKey: queryKeys.grading.questions({ taskId, quizId }),
    queryFn: () => apiClient.get<GradingQuestion[]>(`/grading/tasks/${taskId}/questions/?quiz_id=${quizId}`),
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
    queryKey: queryKeys.grading.answers({ taskId, quizId, questionId }),
    queryFn: () =>
      apiClient.get<GradingAnswerResponse>(
        `/grading/tasks/${taskId}/answers/?question_id=${questionId}&quiz_id=${quizId}`
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
      apiClient.post(`/grading/tasks/${taskId}/submit/`, data),
    onSuccess: () => invalidateAfterGradingMutation(queryClient),
    onError: () => undefined,
  });
};
