import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { tokenStorage } from '@/lib/token-storage';
import type { RoleCode } from '@/types/api';

const VALID_ROLES: RoleCode[] = ['STUDENT', 'MENTOR', 'DEPT_MANAGER', 'TEAM_MANAGER', 'ADMIN'];

/**
 * 获取当前角色
 * 优先级：URL 路径 > 本地持久化角色 > availableRoles 首项
 */
export function useCurrentRole() {
  const location = useLocation();
  const { availableRoles } = useAuth();

  const currentRole = useMemo((): RoleCode | null => {
    let result: RoleCode | null = null;

    // 1. 优先从 URL path 获取 (解决在父级 Layout 中无法获取子路由参数的问题)
    const pathParts = location.pathname.split('/').filter(Boolean);
    const firstPart = pathParts[0]?.toUpperCase();
    if (firstPart && VALID_ROLES.includes(firstPart as RoleCode)) {
      result = firstPart as RoleCode;
    }
    // 2. 从本地持久化角色恢复
    else {
      const storedRole = tokenStorage.getCurrentRole();
      if (storedRole && VALID_ROLES.includes(storedRole)) {
        result = storedRole;
      }
      // 3. 使用第一个可用角色
      else if (availableRoles.length > 0) {
        result = availableRoles[0].code;
      }
    }

    if (result) {
      tokenStorage.setCurrentRole(result);
    }

    return result;
  }, [location.pathname, availableRoles]);

  return currentRole;
}
