import { useCallback } from 'react';
import { useNavigate, useParams, type NavigateOptions } from 'react-router-dom';
import { tokenStorage } from '@/lib/token-storage';
import {
  getRoleFromPathname,
  getWorkspacePath,
  normalizeRoleCode,
} from '@/app/workspace-config';

/**
 * 带角色前缀的导航 hook
 * 自动在路径前添加当前角色前缀
 */
export function useRoleNavigate() {
  const navigate = useNavigate();
  const { role: urlRole } = useParams<{ role: string }>();

  const roleNavigate = useCallback(
    (path: string, options?: NavigateOptions) => {
      // 如果路径已经包含角色前缀，直接导航
      if (getRoleFromPathname(path)) {
        navigate(path, options);
        return;
      }

      const targetRole = normalizeRoleCode(urlRole) ?? tokenStorage.getCurrentRole();
      const nextPath = getWorkspacePath(targetRole, path);
      navigate(nextPath ?? path, options);
    },
    [navigate, urlRole]
  );

  // 获取带角色前缀的路径（不导航）
  const getRolePath = useCallback(
    (path: string): string => {
      const targetRole = normalizeRoleCode(urlRole) ?? tokenStorage.getCurrentRole();
      return getWorkspacePath(targetRole, path) ?? path;
    },
    [urlRole]
  );

  return { roleNavigate, getRolePath };
}
