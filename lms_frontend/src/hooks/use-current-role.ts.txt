import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { getRoleFromPathname, normalizeRoleCode } from '@/app/workspace-config';

/**
 * 获取当前角色
 * 优先级：AuthContext 当前角色 > URL 路径 > availableRoles 首项
 */
export function useCurrentRole() {
  const location = useLocation();
  const { currentRole: authCurrentRole, availableRoles } = useAuth();

  const resolvedRole = useMemo(() => {
    // 1. 优先使用 token 同步后的角色
    const normalizedAuthRole = normalizeRoleCode(authCurrentRole);
    if (normalizedAuthRole) {
      return normalizedAuthRole;
    }

    // 2. 回退到 URL path（用于初始渲染）
    const pathnameRole = getRoleFromPathname(location.pathname);
    if (pathnameRole) {
      return pathnameRole;
    }

    // 3. 使用第一个可用角色
    return availableRoles[0]?.code ?? null;
  }, [location.pathname, authCurrentRole, availableRoles]);

  return resolvedRole;
}
