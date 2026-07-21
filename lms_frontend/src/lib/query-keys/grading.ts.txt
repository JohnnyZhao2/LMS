import { normalizeRoleKey, type QueryRole } from '@/lib/query-keys/shared';

export const gradingQueryKeys = {
    pendingRoot: () => ['grading', 'pending'] as const,
    pending: (currentRole: QueryRole) => ['grading', 'pending', normalizeRoleKey(currentRole)] as const,
    taskAnalyticsRoot: () => ['task-analytics'] as const,
    taskAnalytics: ({
      currentRole,
      taskId,
    }: {
      currentRole: QueryRole;
      taskId: number;
    }) => ['task-analytics', normalizeRoleKey(currentRole), taskId] as const,
    studentExecutionsRoot: () => ['student-executions'] as const,
    studentExecutions: ({
      currentRole,
      taskId,
    }: {
      currentRole: QueryRole;
      taskId: number;
    }) => ['student-executions', normalizeRoleKey(currentRole), taskId] as const,
    questionsRoot: () => ['grading-questions'] as const,
    questions: ({
      currentRole,
      taskId,
      quizId,
    }: {
      currentRole: QueryRole;
      taskId: number;
      quizId: number | null;
    }) => ['grading-questions', normalizeRoleKey(currentRole), taskId, quizId] as const,
    answersRoot: () => ['grading-answers'] as const,
    answers: ({
      currentRole,
      taskId,
      quizId,
      questionId,
    }: {
      currentRole: QueryRole;
      taskId: number;
      quizId: number | null;
      questionId: number | null;
    }) => ['grading-answers', normalizeRoleKey(currentRole), taskId, quizId, questionId] as const,
} as const;
