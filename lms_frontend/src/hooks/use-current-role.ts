import { useParams, useLocation } from 'react-router-dom';
import { useMemo, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { roleState } from '@/lib/role-state';
import { tokenStorage } from '@/lib/token-storage';
import type { RoleCode } from '@/types/api';

const VALID_ROLES: RoleCode[] = ['STUDENT', 'MENTOR', 'DEPT_MANAGER', 'TEAM_MANAGER', 'ADMIN'];

/**
 * 获取当前角色
 * 优先级：URL 参数 > localStorage
 * 同时同步到全局状态供 API 请求使用
 */
export function useCurrentRole() {
  const { role } = useParams<{ role: string }>();
  const location = useLocation();
  const { availableRoles } = useAuth();

  const currentRole = useMemo((): RoleCode | null => {
    // 1. 优先从 URL path 获取 (解决在父级 Layout 中无法获取子路由参数的问题)
    const pathParts = location.pathname.split('/').filter(Boolean);
    const firstPart = pathParts[0]?.toUpperCase();
    if (firstPart && VALID_ROLES.includes(firstPart as RoleCode)) {
      return firstPart as RoleCode;
    }

    // 2. 尝试从 useParams 获取 (保留作为兼容)
    if (role) {
      const roleCode = role.toUpperCase() as RoleCode;
      if (VALID_ROLES.includes(roleCode)) {
        return roleCode;
      }
    }

    // 3. fallback 到 localStorage
    const storedRole = tokenStorage.getCurrentRole();
    if (storedRole && VALID_ROLES.includes(storedRole)) {
      return storedRole;
    }

    // 4. 使用第一个可用角色
    if (availableRoles.length > 0) {
      return availableRoles[0].code;
    }

    return null;
  }, [role, location.pathname, availableRoles]);

  // 同步到全局状态（供 API 请求使用）和 localStorage
  useEffect(() => {
    if (currentRole) {
      roleState.set(currentRole);
      // 可选：同时也更新 localStorage，虽然后续主要依赖 URL
      tokenStorage.setCurrentRole(currentRole);
    }
  }, [currentRole]);

  return currentRole;
}
