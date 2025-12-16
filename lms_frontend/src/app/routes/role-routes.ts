/**
 * Role Route Mappings
 * Defines default routes and accessible routes for each role
 * Requirements: 3.2, 3.3, 3.4, 3.5
 */

import { type RoleCode, ROLE_CODES, ROLE_DEFAULT_ROUTES } from '@/config/roles';

/**
 * Routes accessible by each role
 * Used for route validation and navigation
 */
export const ROLE_ACCESSIBLE_ROUTES: Record<RoleCode, string[]> = {
  // 学员: 仪表盘、知识中心、任务中心、个人中心
  // Requirements: 3.2
  [ROLE_CODES.STUDENT]: [
    '/dashboard',
    '/knowledge',
    '/knowledge/:id',
    '/tasks',
    '/tasks/practice/:taskId',
    '/tasks/exam/:taskId',
    '/personal',
  ],

  // 导师: 仪表盘、测试中心、任务管理、评分中心、抽查中心
  // Requirements: 3.3
  [ROLE_CODES.MENTOR]: [
    '/dashboard',
    '/test-center',
    '/task-management',
    '/tasks/create',
    '/grading',
    '/spot-checks',
    '/knowledge',
    '/knowledge/:id',
  ],

  // 室经理: 同导师
  // Requirements: 3.3
  [ROLE_CODES.DEPT_MANAGER]: [
    '/dashboard',
    '/test-center',
    '/task-management',
    '/tasks/create',
    '/grading',
    '/spot-checks',
    '/knowledge',
    '/knowledge/:id',
  ],

  // 管理员: 测试中心、知识库管理、任务管理、用户与权限
  // Requirements: 3.4
  [ROLE_CODES.ADMIN]: [
    '/test-center',
    '/knowledge-management',
    '/task-management',
    '/tasks/create',
    '/users',
    '/organization',
    '/mentorship',
    '/knowledge',
    '/knowledge/:id',
  ],

  // 团队经理: 团队数据看板
  // Requirements: 3.5
  [ROLE_CODES.TEAM_MANAGER]: [
    '/team-dashboard',
  ],
};

/**
 * Check if a role can access a specific route
 * Supports route patterns with parameters (e.g., /knowledge/:id)
 */
export function canRoleAccessRoute(role: RoleCode, path: string): boolean {
  const accessibleRoutes = ROLE_ACCESSIBLE_ROUTES[role] || [];
  
  // Direct match
  if (accessibleRoutes.includes(path)) {
    return true;
  }

  // Pattern match (for routes with parameters)
  return accessibleRoutes.some(route => {
    // Convert route pattern to regex
    const pattern = route
      .replace(/:[^/]+/g, '[^/]+') // Replace :param with regex
      .replace(/\//g, '\\/');       // Escape slashes
    
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(path);
  });
}

/**
 * Get the default route for a role
 * Used after login or when redirecting from unauthorized routes
 */
export function getDefaultRouteForRole(role: RoleCode): string {
  return ROLE_DEFAULT_ROUTES[role] || '/dashboard';
}

/**
 * Get all accessible routes for a role
 */
export function getAccessibleRoutesForRole(role: RoleCode): string[] {
  return ROLE_ACCESSIBLE_ROUTES[role] || [];
}

/**
 * Check if a route requires authentication
 * Public routes don't require login
 */
export const PUBLIC_ROUTES = ['/login'];

export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.includes(path);
}

/**
 * Get the first accessible route for a role
 * Useful for redirecting after role switch
 */
export function getFirstAccessibleRoute(role: RoleCode): string {
  const routes = ROLE_ACCESSIBLE_ROUTES[role];
  if (routes && routes.length > 0) {
    // Return the first non-parameterized route
    const staticRoute = routes.find(r => !r.includes(':'));
    return staticRoute || routes[0].replace(/:[^/]+/g, '1');
  }
  return '/dashboard';
}

/**
 * Map of route paths to their display names
 * Used for breadcrumbs and navigation
 */
export const ROUTE_NAMES: Record<string, string> = {
  '/dashboard': '仪表盘',
  '/knowledge': '知识中心',
  '/tasks': '任务中心',
  '/personal': '个人中心',
  '/test-center': '测试中心',
  '/task-management': '任务管理',
  '/grading': '评分中心',
  '/spot-checks': '抽查中心',
  '/knowledge-management': '知识库管理',
  '/users': '用户管理',
  '/organization': '组织架构',
  '/mentorship': '师徒关系',
  '/team-dashboard': '团队数据看板',
};

/**
 * Get display name for a route
 */
export function getRouteName(path: string): string {
  // Try exact match first
  if (ROUTE_NAMES[path]) {
    return ROUTE_NAMES[path];
  }

  // Try to match base path
  const basePath = '/' + path.split('/')[1];
  return ROUTE_NAMES[basePath] || path;
}

export default {
  ROLE_ACCESSIBLE_ROUTES,
  canRoleAccessRoute,
  getDefaultRouteForRole,
  getAccessibleRoutesForRole,
  isPublicRoute,
  getFirstAccessibleRoute,
  getRouteName,
};
