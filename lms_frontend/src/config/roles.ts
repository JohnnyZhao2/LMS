/**
 * Role configuration and menu mappings
 * Defines role constants, permissions, and navigation structure
 */

import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  User,
  FileQuestion,
  Users,
  CheckSquare,
  ClipboardCheck,
  Settings,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';

// Role codes matching backend
export const ROLE_CODES = {
  STUDENT: 'STUDENT',
  MENTOR: 'MENTOR',
  DEPT_MANAGER: 'DEPT_MANAGER',
  ADMIN: 'ADMIN',
  TEAM_MANAGER: 'TEAM_MANAGER',
} as const;

export type RoleCode = keyof typeof ROLE_CODES;

// Role display names
export const ROLE_NAMES: Record<RoleCode, string> = {
  STUDENT: '学员',
  MENTOR: '导师',
  DEPT_MANAGER: '室经理',
  ADMIN: '管理员',
  TEAM_MANAGER: '团队经理',
};

// Menu item interface
export interface MenuItem {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  children?: MenuItem[];
}

// Menu configuration for each role
// Requirements 3.2, 3.3, 3.4, 3.5
export const ROLE_MENUS: Record<RoleCode, MenuItem[]> = {
  // 学员菜单: 仪表盘、知识中心、任务中心、个人中心
  STUDENT: [
    { key: 'dashboard', label: '仪表盘', path: '/dashboard', icon: LayoutDashboard },
    { key: 'knowledge', label: '知识中心', path: '/knowledge', icon: BookOpen },
    { key: 'tasks', label: '任务中心', path: '/tasks', icon: ClipboardList },
    { key: 'personal', label: '个人中心', path: '/personal', icon: User },
  ],
  
  // 导师菜单: 仪表盘、测试中心、任务管理、评分中心、抽查中心
  MENTOR: [
    { key: 'dashboard', label: '仪表盘', path: '/dashboard', icon: LayoutDashboard },
    { key: 'test-center', label: '测试中心', path: '/test-center', icon: FileQuestion },
    { key: 'task-mgmt', label: '任务管理', path: '/task-management', icon: ClipboardList },
    { key: 'grading', label: '评分中心', path: '/grading', icon: CheckSquare },
    { key: 'spot-checks', label: '抽查中心', path: '/spot-checks', icon: ClipboardCheck },
  ],
  
  // 室经理菜单: 同导师
  DEPT_MANAGER: [
    { key: 'dashboard', label: '仪表盘', path: '/dashboard', icon: LayoutDashboard },
    { key: 'test-center', label: '测试中心', path: '/test-center', icon: FileQuestion },
    { key: 'task-mgmt', label: '任务管理', path: '/task-management', icon: ClipboardList },
    { key: 'grading', label: '评分中心', path: '/grading', icon: CheckSquare },
    { key: 'spot-checks', label: '抽查中心', path: '/spot-checks', icon: ClipboardCheck },
  ],
  
  // 管理员菜单: 测试中心、知识库管理、任务管理、用户与权限
  ADMIN: [
    { key: 'test-center', label: '测试中心', path: '/test-center', icon: FileQuestion },
    { key: 'knowledge-mgmt', label: '知识库管理', path: '/knowledge-management', icon: BookOpen },
    { key: 'task-mgmt', label: '任务管理', path: '/task-management', icon: ClipboardList },
    { key: 'user-mgmt', label: '用户与权限', path: '/users', icon: Users, children: [
      { key: 'user-list', label: '用户管理', path: '/users', icon: Users },
      { key: 'org', label: '组织架构', path: '/organization', icon: Settings },
      { key: 'mentorship', label: '师徒关系', path: '/mentorship', icon: Users },
    ]},
  ],
  
  // 团队经理菜单: 团队数据看板
  TEAM_MANAGER: [
    { key: 'team-dashboard', label: '团队数据看板', path: '/team-dashboard', icon: BarChart3 },
  ],
};

// Default route for each role after login
export const ROLE_DEFAULT_ROUTES: Record<RoleCode, string> = {
  STUDENT: '/dashboard',
  MENTOR: '/dashboard',
  DEPT_MANAGER: '/dashboard',
  ADMIN: '/test-center',
  TEAM_MANAGER: '/team-dashboard',
};

// Role hierarchy for permission checks (higher number = more permissions)
export const ROLE_HIERARCHY: Record<RoleCode, number> = {
  STUDENT: 1,
  MENTOR: 2,
  DEPT_MANAGER: 3,
  ADMIN: 4,
  TEAM_MANAGER: 2, // Same level as mentor but different scope
};

// Check if a role can access another role's resources
export function canAccessRole(currentRole: RoleCode, targetRole: RoleCode): boolean {
  return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[targetRole];
}

// Get menu items for a specific role
export function getMenuItemsForRole(role: RoleCode): MenuItem[] {
  return ROLE_MENUS[role] || [];
}

// Check if user has multiple roles (for role switcher visibility)
export function hasMultipleRoles(roles: RoleCode[]): boolean {
  return roles.length > 1;
}

// Check if role switcher should be visible
// Requirements 2.1, 2.6: Only show for users with multiple roles
export function shouldShowRoleSwitcher(roles: RoleCode[]): boolean {
  return hasMultipleRoles(roles);
}
