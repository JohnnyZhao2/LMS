import { Navigate, useParams, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/features/auth/stores/auth-context';
import { ROUTES } from '@/config/routes';
import { showApiError } from '@/utils/error-handler';
import type { RoleCode } from '@/types/api';
import { getWorkspaceHome, normalizeRoleCode } from '@/app/workspace-config';

/**
 * 角色路由包装器
 * 处理 /:role/* 格式的路由，从 URL 中提取角色并同步到全局状态
 */
export const RoleRouteWrapper: React.FC = () => {
  const { role } = useParams<{ role: string }>();
  const location = useLocation();
  const { isAuthenticated, isLoading, availableRoles, currentRole, isSwitching, switchRole } = useAuth();
  const [failedRoleSync, setFailedRoleSync] = useState<RoleCode | null>(null);

  const roleCode = normalizeRoleCode(role);
  const isValidRole = roleCode !== null;
  const hasRole = availableRoles.some((item) => item.code === roleCode);
  const shouldSyncRole = Boolean(
    isAuthenticated &&
    !isLoading &&
    isValidRole &&
    hasRole &&
    currentRole &&
    currentRole !== roleCode,
  );
  const resolveFallbackRole = (): RoleCode | null => {
    if (currentRole && availableRoles.some((item) => item.code === currentRole)) {
      return currentRole;
    }
    return availableRoles[0]?.code ?? null;
  };

  useEffect(() => {
    if (!shouldSyncRole || !roleCode || isSwitching || failedRoleSync === roleCode) {
      return;
    }

    void switchRole(roleCode).catch((error) => {
      showApiError(error, '角色切换失败');
      setFailedRoleSync(roleCode);
    });
  }, [
    failedRoleSync,
    isSwitching,
    roleCode,
    shouldSyncRole,
    switchRole,
  ]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (shouldSyncRole || isSwitching) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // 无效角色，重定向到默认角色
  if (!isValidRole) {
    const fallbackRole = resolveFallbackRole();
    if (!fallbackRole) {
      return <Navigate to={ROUTES.LOGIN} replace />;
    }
    return <Navigate to={getWorkspaceHome(fallbackRole) ?? ROUTES.LOGIN} replace />;
  }

  // 检查用户是否有该角色权限
  if (!hasRole) {
    const fallbackRole = resolveFallbackRole();
    if (!fallbackRole) {
      return <Navigate to={ROUTES.LOGIN} replace />;
    }

    const fallbackPath = getWorkspaceHome(fallbackRole) ?? ROUTES.LOGIN;
    if (fallbackPath === location.pathname) {
      return <Navigate to={ROUTES.LOGIN} replace />;
    }

    return <Navigate to={fallbackPath} replace />;
  }

  if (failedRoleSync === roleCode) {
    const fallbackRole = resolveFallbackRole();
    if (!fallbackRole) {
      return <Navigate to={ROUTES.LOGIN} replace />;
    }
    return <Navigate to={getWorkspaceHome(fallbackRole) ?? ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
};
