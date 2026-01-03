/**
 * 路由配置统一导出
 */
import { authRoutes } from './auth';
import { dashboardRoutes } from './dashboard';
import { knowledgeRoutes } from './knowledge';
import { taskRoutes } from './tasks';
import { submissionRoutes } from './submissions';
import { gradingRoutes } from './grading';
import { testCenterRoutes } from './test-center';
import { spotCheckRoutes } from './spot-checks';
import { userRoutes } from './users';
import { otherRoutes } from './other';

export const allRoutes = [
  ...authRoutes,
  ...dashboardRoutes,
  ...knowledgeRoutes,
  ...taskRoutes,
  ...submissionRoutes,
  ...gradingRoutes,
  ...testCenterRoutes,
  ...spotCheckRoutes,
  ...userRoutes,
  ...otherRoutes,
];
