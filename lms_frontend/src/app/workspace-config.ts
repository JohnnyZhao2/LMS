import { AppLayout } from '@/components/layouts/app-layout';
import { StudentLayout } from '@/components/layouts/student-layout';
import { isRoleCode } from '@/config/role-constants';
import type { RoleCode } from '@/types/api';

type DashboardVariant = 'student' | 'mentor' | 'team_manager' | 'admin';
type MenuVariant = 'student' | 'manager' | 'admin';

interface WorkspaceConfig {
  home: string;
  layout: typeof AppLayout;
  requiredCapability: string;
  dashboardVariant: DashboardVariant;
  menuVariant: MenuVariant;
}

const WORKSPACE_CONFIG: Record<RoleCode, WorkspaceConfig> = {
  STUDENT: {
    home: '/student/dashboard',
    layout: StudentLayout,
    requiredCapability: 'dashboard.student.view',
    dashboardVariant: 'student',
    menuVariant: 'student',
  },
  MENTOR: {
    home: '/mentor/dashboard',
    layout: AppLayout,
    requiredCapability: 'dashboard.mentor.view',
    dashboardVariant: 'mentor',
    menuVariant: 'manager',
  },
  DEPT_MANAGER: {
    home: '/dept_manager/dashboard',
    layout: AppLayout,
    requiredCapability: 'dashboard.mentor.view',
    dashboardVariant: 'mentor',
    menuVariant: 'manager',
  },
  TEAM_MANAGER: {
    home: '/team_manager/dashboard',
    layout: AppLayout,
    requiredCapability: 'dashboard.team_manager.view',
    dashboardVariant: 'team_manager',
    menuVariant: 'student',
  },
  ADMIN: {
    home: '/admin/dashboard',
    layout: AppLayout,
    requiredCapability: 'dashboard.admin.view',
    dashboardVariant: 'admin',
    menuVariant: 'admin',
  },
  SUPER_ADMIN: {
    home: '/super_admin/dashboard',
    layout: AppLayout,
    requiredCapability: 'dashboard.admin.view',
    dashboardVariant: 'admin',
    menuVariant: 'admin',
  },
};

export const getWorkspaceConfig = (role: RoleCode | null | undefined): WorkspaceConfig | null => {
  if (!role) {
    return null;
  }
  return WORKSPACE_CONFIG[role] ?? null;
};

export const normalizeRoleCode = (
  role: string | RoleCode | null | undefined,
): RoleCode | null => {
  if (!role) {
    return null;
  }

  const normalizedRole = String(role).toUpperCase();
  return isRoleCode(normalizedRole) ? normalizedRole : null;
};

export const getRoleFromPathname = (pathname: string): RoleCode | null => {
  const firstSegment = pathname.split('/').filter(Boolean)[0];
  return normalizeRoleCode(firstSegment);
};

export const getRolePathPrefix = (
  role: string | RoleCode | null | undefined,
): string => {
  const normalizedRole = normalizeRoleCode(role);
  return normalizedRole ? `/${normalizedRole.toLowerCase()}` : '';
};

export const resolveWorkspaceRole = (
  primaryRole: string | RoleCode | null | undefined,
  fallbackRole?: string | RoleCode | null,
  availableRoles: readonly RoleCode[] = [],
): RoleCode | null => {
  const resolvedPrimaryRole = normalizeRoleCode(primaryRole);
  if (resolvedPrimaryRole) {
    return resolvedPrimaryRole;
  }

  const resolvedFallbackRole = normalizeRoleCode(fallbackRole);
  if (resolvedFallbackRole) {
    return resolvedFallbackRole;
  }

  for (const role of availableRoles) {
    const normalizedRole = normalizeRoleCode(role);
    if (normalizedRole) {
      return normalizedRole;
    }
  }

  return null;
};

export const getWorkspacePath = (
  role: string | RoleCode | null | undefined,
  path: string = 'dashboard',
): string | null => {
  const rolePrefix = getRolePathPrefix(role);
  if (!rolePrefix) {
    return null;
  }

  const normalizedPath = path.replace(/^\/+/, '') || 'dashboard';
  return `${rolePrefix}/${normalizedPath}`;
};

export const stripWorkspacePathPrefix = (pathname: string): string => {
  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments.length <= 1) {
    return 'dashboard';
  }
  return pathSegments.slice(1).join('/');
};

export const getWorkspaceHome = (role: RoleCode | null | undefined): string | null => {
  return getWorkspaceConfig(role)?.home ?? null;
};

export const getFirstAccessibleWorkspaceHome = (
  roles: RoleCode[],
  hasCapability: (permissionCode: string) => boolean,
): string | null => {
  for (const role of roles) {
    const workspace = getWorkspaceConfig(role);
    if (workspace && hasCapability(workspace.requiredCapability)) {
      return workspace.home;
    }
  }
  return null;
};

export const getAccessibleWorkspaceHome = (
  roles: RoleCode[],
  hasCapability: (permissionCode: string) => boolean,
  preferredRole?: string | RoleCode | null,
): string | null => {
  const normalizedPreferredRole = normalizeRoleCode(preferredRole);
  if (normalizedPreferredRole && roles.includes(normalizedPreferredRole)) {
    const preferredWorkspace = getWorkspaceConfig(normalizedPreferredRole);
    if (preferredWorkspace && hasCapability(preferredWorkspace.requiredCapability)) {
      return preferredWorkspace.home;
    }
  }

  return getFirstAccessibleWorkspaceHome(roles, hasCapability);
};
