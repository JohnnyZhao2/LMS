import { activityLogsQueryKeys } from '@/lib/query-keys/activity-logs';
import { authorizationQueryKeys } from '@/lib/query-keys/authorization';
import { dashboardsQueryKeys } from '@/lib/query-keys/dashboards';
import { gradingQueryKeys } from '@/lib/query-keys/grading';
import { knowledgeQueryKeys } from '@/lib/query-keys/knowledge';
import { questionsQueryKeys } from '@/lib/query-keys/questions';
import { quizzesQueryKeys } from '@/lib/query-keys/quizzes';
import { spotChecksQueryKeys } from '@/lib/query-keys/spot-checks';
import { submissionsQueryKeys } from '@/lib/query-keys/submissions';
import { tagsQueryKeys } from '@/lib/query-keys/tags';
import { tasksQueryKeys } from '@/lib/query-keys/tasks';
import { usersQueryKeys } from '@/lib/query-keys/users';

export const queryKeys = {
  activityLogs: activityLogsQueryKeys,
  authorization: authorizationQueryKeys,
  dashboards: dashboardsQueryKeys,
  grading: gradingQueryKeys,
  knowledge: knowledgeQueryKeys,
  questions: questionsQueryKeys,
  quizzes: quizzesQueryKeys,
  spotChecks: spotChecksQueryKeys,
  submissions: submissionsQueryKeys,
  tags: tagsQueryKeys,
  tasks: tasksQueryKeys,
  users: usersQueryKeys,
} as const;
