/**
 * 路由配置常量
 */
export const ROUTES = {
  LOGIN: '/login',
  LOGIN_OIDC_CALLBACK: '/login/oidc/callback',
  DASHBOARD: '/dashboard',
  AUTHORIZATION: '/authorization',
  AUDIT_LOGS: '/audit-logs',
  AUDIT_LOG_POLICY: '/audit-logs/policy',
  KNOWLEDGE: '/knowledge',
  TAGS: '/tags',
  TASKS: '/tasks',
  PERSONAL: '/personal',
  SPOT_CHECKS: '/spot-checks',
  QUIZZES: '/quizzes',
  QUESTIONS: '/questions',
  USERS: '/users',
  USER_AUTHORIZATION: '/users/authorization',
  ANALYTICS: '/analytics',
  QUIZ: '/quiz',
  GRADING_CENTER: '/grading-center',
} as const;
