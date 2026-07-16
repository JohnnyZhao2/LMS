import { isRoleCode } from '@/config/role-constants';
import type { RoleCode } from '@/types/common';

export const WORKSPACE_HOME_BY_ROLE: Record<RoleCode, string> = {
  STUDENT: '/student/dashboard',
  MENTOR: '/mentor/dashboard',
  DEPT_MANAGER: '/dept_manager/dashboard',
  TEAM_MANAGER: '/team_manager/dashboard',
  ADMIN: '/admin/dashboard',
  SUPER_ADMIN: '/super_admin/dashboard',
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
  if (!role) {
    return null;
  }
  return WORKSPACE_HOME_BY_ROLE[role] ?? null;
};

export const getFirstAccessibleWorkspaceHome = (roles: RoleCode[]): string | null => {
  for (const role of roles) {
    const home = getWorkspaceHome(role);
    if (home) {
      return home;
    }
  }
  return null;
};

export const getAccessibleWorkspaceHome = (
  roles: RoleCode[],
  preferredRole?: string | RoleCode | null,
): string | null => {
  const normalizedPreferredRole = normalizeRoleCode(preferredRole);
  if (normalizedPreferredRole && roles.includes(normalizedPreferredRole)) {
    return getWorkspaceHome(normalizedPreferredRole);
  }

  return getFirstAccessibleWorkspaceHome(roles);
};
