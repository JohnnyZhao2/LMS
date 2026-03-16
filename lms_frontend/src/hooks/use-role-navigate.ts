import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { tokenStorage } from '@/lib/token-storage';

/**
 * 带角色前缀的导航 hook
 * 自动在路径前添加当前角色前缀
 */
export function useRoleNavigate() {
  const navigate = useNavigate();
  const { role: urlRole } = useParams<{ role: string }>();

  const roleNavigate = useCallback(
    (path: string, options?: { replace?: boolean }) => {
      // 获取角色前缀
      const role = urlRole || tokenStorage.getCurrentRole();
      const rolePrefix = role ? `/${role.toLowerCase()}` : '';

      // 如果路径已经包含角色前缀，直接导航
      if (path.startsWith('/student/') || path.startsWith('/mentor/') ||
          path.startsWith('/admin/') || path.startsWith('/dept_manager/') ||
          path.startsWith('/team_manager/') || path.startsWith('/super_admin/')) {
        navigate(path, options);
        return;
      }

      // 移除路径开头的斜杠
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      navigate(`${rolePrefix}/${cleanPath}`, options);
    },
    [navigate, urlRole]
  );

  // 获取带角色前缀的路径（不导航）
  const getRolePath = useCallback(
    (path: string): string => {
      const role = urlRole || tokenStorage.getCurrentRole();
      const rolePrefix = role ? `/${role.toLowerCase()}` : '';
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      return `${rolePrefix}/${cleanPath}`;
    },
    [urlRole]
  );

  return { roleNavigate, getRolePath };
}
