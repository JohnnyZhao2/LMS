import { useCallback } from 'react';
import { useNavigate, useParams, type NavigateOptions } from 'react-router-dom';
import { useAuth } from '@/session/auth/auth-context';
import {
  getRoleFromPathname,
  getWorkspacePath,
  resolveWorkspaceRole,
} from '@/session/workspace/role-paths';

/**
 * 带角色前缀的导航 hook
 * 自动在路径前添加当前角色前缀
 */
export function useRoleNavigate() {
  const navigate = useNavigate();
  const { role: urlRole } = useParams<{ role: string }>();
  const { currentRole, availableRoles } = useAuth();

  const resolvedRole = resolveWorkspaceRole(
    urlRole,
    currentRole,
    availableRoles.map((role) => role.code),
  );

  const roleNavigate = useCallback(
    (path: string, options?: NavigateOptions) => {
      // 如果路径已经包含角色前缀，直接导航
      if (getRoleFromPathname(path)) {
        navigate(path, options);
        return;
      }

      const nextPath = getWorkspacePath(resolvedRole, path);
      navigate(nextPath ?? path, options);
    },
    [navigate, resolvedRole]
  );

  // 获取带角色前缀的路径（不导航）
  const getRolePath = useCallback(
    (path: string): string => {
      return getWorkspacePath(resolvedRole, path) ?? path;
    },
    [resolvedRole]
  );

  return { roleNavigate, getRolePath };
}
