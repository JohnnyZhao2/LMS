import type { QueryClient, QueryKey } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';

const invalidateMany = (
  queryClient: QueryClient,
  keys: readonly QueryKey[],
) => Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

export const invalidateAfterActivityLogDeletion = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.activityLogs.all(),
  ]);

export const invalidateAfterActivityLogPolicyMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.activityLogs.policies(),
  ]);

export const invalidateAfterAuthorizationOverrideMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.authorization.userOverridesRoot(),
    queryKeys.authorization.userScopeGroupOverridesRoot(),
  ]);

export const invalidateAfterGradingMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.grading.answersRoot(),
    queryKeys.grading.questionsRoot(),
    queryKeys.grading.pendingRoot(),
    queryKeys.grading.taskAnalyticsRoot(),
    queryKeys.grading.studentExecutionsRoot(),
  ]);

export const invalidateAfterKnowledgeMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.knowledge.listRoot(),
    queryKeys.knowledge.detailRoot(),
    queryKeys.tasks.resourceOptionsRoot(),
  ]);

export const invalidateAfterKnowledgeViewMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.knowledge.listRoot(),
  ]);

export const invalidateAfterQuestionMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.questions.all(),
    queryKeys.questions.detailRoot(),
  ]);

export const invalidateAfterQuizMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.quizzes.all(),
    queryKeys.quizzes.detailRoot(),
    queryKeys.tasks.resourceOptionsRoot(),
  ]);

export const invalidateAfterRoleTemplateMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.authorization.permissionCatalogRoot(),
    queryKeys.authorization.roleTemplatesRoot(),
    queryKeys.authorization.userOverridesRoot(),
    queryKeys.authorization.userScopeGroupOverridesRoot(),
  ]);

export const invalidateAfterSpotCheckMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.spotChecks.all(),
    queryKeys.spotChecks.detailRoot(),
  ]);

export const invalidateAfterSubmissionAnswerSaved = (
  queryClient: QueryClient,
  submissionId: number,
) => invalidateMany(queryClient, [
  queryKeys.submissions.detail(submissionId),
]);

export const invalidateAfterSubmissionSubmitted = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.tasks.studentRoot(),
  ]);

export const invalidateAfterTagMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.tags.all(),
    queryKeys.questions.all(),
    queryKeys.questions.detailRoot(),
    queryKeys.knowledge.listRoot(),
    queryKeys.knowledge.detailRoot(),
    queryKeys.tasks.resourceOptionsRoot(),
  ]);

export const invalidateAfterTaskMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.tasks.all(),
    queryKeys.tasks.detailRoot(),
    queryKeys.tasks.studentRoot(),
    queryKeys.tasks.studentLearningDetailRoot(),
  ]);

export const invalidateAfterTaskProgressMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    queryKeys.tasks.studentRoot(),
    queryKeys.tasks.detailRoot(),
    queryKeys.tasks.studentLearningDetailRoot(),
  ]);

export const invalidateAfterUserMutation = (
  queryClient: QueryClient,
  options: {
    includeMentors?: boolean;
    includeAssignableUsers?: boolean;
  } = {},
) => {
  const keys: QueryKey[] = [
    queryKeys.users.all(),
    queryKeys.users.detailRoot(),
  ];

  if (options.includeMentors) {
    keys.push(queryKeys.users.mentorsRoot());
  }

  if (options.includeAssignableUsers) {
    keys.push(queryKeys.users.assignableRoot());
  }

  return invalidateMany(queryClient, keys);
};
