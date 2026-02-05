import { useParams, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
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
    let result: RoleCode | null = null;

    // 1. 优先从 URL path 获取 (解决在父级 Layout 中无法获取子路由参数的问题)
    const pathParts = location.pathname.split('/').filter(Boolean);
    const firstPart = pathParts[0]?.toUpperCase();
    if (firstPart && VALID_ROLES.includes(firstPart as RoleCode)) {
      result = firstPart as RoleCode;
    }
    // 2. 尝试从 useParams 获取 (保留作为兼容)
    else if (role) {
      const roleCode = role.toUpperCase() as RoleCode;
      if (VALID_ROLES.includes(roleCode)) {
        result = roleCode;
      }
    }
    // 3. fallback 到 localStorage
    else {
      const storedRole = tokenStorage.getCurrentRole();
      if (storedRole && VALID_ROLES.includes(storedRole)) {
        result = storedRole;
      }
      // 4. 使用第一个可用角色
      else if (availableRoles.length > 0) {
        result = availableRoles[0].code;
      }
    }

    // 🔧 关键修复：在返回值之前同步更新 roleState
    // 这样可以避免竞态条件：React Query 发起请求时 roleState 已经是最新值
    if (result) {
      roleState.set(result);
      tokenStorage.setCurrentRole(result);
    }

    return result;
  }, [role, location.pathname, availableRoles]);

  // 注意：不再需要 useEffect 来更新 roleState，因为已在 useMemo 中同步更新

  return currentRole;
}
