import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import type { RoleCode } from '@/types/api';

const VALID_ROLES: RoleCode[] = ['STUDENT', 'MENTOR', 'DEPT_MANAGER', 'TEAM_MANAGER', 'ADMIN'];

/**
 * 获取当前角色
 * 优先级：URL 路径 > AuthContext 当前角色 > availableRoles 首项
 */
export function useCurrentRole() {
  const location = useLocation();
  const { currentRole: authCurrentRole, availableRoles } = useAuth();

  const resolvedRole = useMemo((): RoleCode | null => {
    // 1. 优先从 URL path 获取 (解决在父级 Layout 中无法获取子路由参数的问题)
    const pathParts = location.pathname.split('/').filter(Boolean);
    const firstPart = pathParts[0]?.toUpperCase();
    if (firstPart && VALID_ROLES.includes(firstPart as RoleCode)) {
      return firstPart as RoleCode;
    }

    // 2. 使用 AuthContext 当前角色
    if (authCurrentRole && VALID_ROLES.includes(authCurrentRole)) {
      return authCurrentRole;
    }

    // 3. 使用第一个可用角色
    return availableRoles[0]?.code ?? null;
  }, [location.pathname, authCurrentRole, availableRoles]);

  return resolvedRole;
}
