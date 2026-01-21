import { useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import type { RoleCode } from '@/types/api';
import { tokenStorage } from '@/lib/token-storage';

const VALID_ROLES: RoleCode[] = ['STUDENT', 'MENTOR', 'DEPT_MANAGER', 'TEAM_MANAGER', 'ADMIN'];

/**
 * 从 URL 路径中提取角色
 * URL 格式: /:role/xxx (如 /student/dashboard, /mentor/tasks)
 */
export function useRoleFromUrl() {
  const location = useLocation();
  const navigate = useNavigate();

  // 从 URL 解析角色
  const roleFromUrl = useMemo((): RoleCode | null => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    if (pathParts.length === 0) return null;

    const firstPart = pathParts[0].toUpperCase() as RoleCode;
    if (VALID_ROLES.includes(firstPart)) {
      return firstPart;
    }
    return null;
  }, [location.pathname]);

  // 获取不含角色前缀的路径
  const pathWithoutRole = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    if (pathParts.length === 0) return '/dashboard';

    const firstPart = pathParts[0].toUpperCase() as RoleCode;
    if (VALID_ROLES.includes(firstPart)) {
      const rest = pathParts.slice(1).join('/');
      return rest ? `/${rest}` : '/dashboard';
    }
    return location.pathname;
  }, [location.pathname]);

  // 导航到带角色前缀的路径
  const navigateWithRole = useCallback(
    (path: string, role?: RoleCode) => {
      const targetRole = role || roleFromUrl || tokenStorage.getCurrentRole();
      if (!targetRole) {
        navigate(path);
        return;
      }

      // 移除路径开头的斜杠
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      // 如果路径已经包含角色前缀，直接导航
      const pathFirstPart = cleanPath.split('/')[0]?.toUpperCase() as RoleCode;
      if (VALID_ROLES.includes(pathFirstPart)) {
        navigate(path);
        return;
      }

      navigate(`/${targetRole.toLowerCase()}/${cleanPath}`);
    },
    [navigate, roleFromUrl]
  );

  // 切换角色（保持当前路径，只换角色前缀）
  const switchRoleInUrl = useCallback(
    (newRole: RoleCode) => {
      const cleanPath = pathWithoutRole.startsWith('/') ? pathWithoutRole.slice(1) : pathWithoutRole;
      navigate(`/${newRole.toLowerCase()}/${cleanPath}`);
    },
    [navigate, pathWithoutRole]
  );

  return {
    roleFromUrl,
    pathWithoutRole,
    navigateWithRole,
    switchRoleInUrl,
  };
}
