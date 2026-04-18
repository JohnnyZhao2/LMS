import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '@/session/auth/auth-context';
import { getRoleFromPathname, resolveWorkspaceRole } from '@/session/workspace/role-paths';

/**
 * 获取当前角色
 * 优先级：AuthContext 当前角色 > URL 路径 > availableRoles 首项
 */
export function useCurrentRole() {
  const location = useLocation();
  const { currentRole: authCurrentRole, availableRoles } = useAuth();

  const resolvedRole = useMemo(() => {
    return resolveWorkspaceRole(
      authCurrentRole,
      getRoleFromPathname(location.pathname),
      availableRoles.map((role) => role.code),
    );
  }, [location.pathname, authCurrentRole, availableRoles]);

  return resolvedRole;
}
