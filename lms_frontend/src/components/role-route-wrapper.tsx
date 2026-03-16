import { Navigate, useParams, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { ROUTES } from '@/config/routes';
import type { RoleCode } from '@/types/api';

const VALID_ROLES: RoleCode[] = ['STUDENT', 'MENTOR', 'DEPT_MANAGER', 'TEAM_MANAGER', 'ADMIN', 'SUPER_ADMIN'];

/**
 * 角色路由包装器
 * 处理 /:role/* 格式的路由，从 URL 中提取角色并同步到全局状态
 */
export const RoleRouteWrapper: React.FC = () => {
  const { role } = useParams<{ role: string }>();
  const location = useLocation();
  const { isAuthenticated, isLoading, availableRoles, currentRole, isSwitching } = useAuth();

  const roleCode = role?.toUpperCase() as RoleCode;
  const isValidRole = VALID_ROLES.includes(roleCode);
  const resolveFallbackRole = (): RoleCode | null => {
    if (currentRole && availableRoles.some((item) => item.code === currentRole)) {
      return currentRole;
    }
    return availableRoles[0]?.code ?? null;
  };

  if (isLoading || isSwitching) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
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
    return <Navigate to={`/${fallbackRole.toLowerCase()}/dashboard`} replace />;
  }

  // 检查用户是否有该角色权限
  const hasRole = availableRoles.some((r) => r.code === roleCode);
  if (!hasRole) {
    const fallbackRole = resolveFallbackRole();
    if (!fallbackRole) {
      return <Navigate to={ROUTES.LOGIN} replace />;
    }

    const fallbackPath = `/${fallbackRole.toLowerCase()}/dashboard`;
    if (fallbackPath === location.pathname) {
      return <Navigate to={ROUTES.LOGIN} replace />;
    }

    return <Navigate to={fallbackPath} replace />;
  }

  if (currentRole && currentRole !== roleCode) {
    return <Navigate to={`/${currentRole.toLowerCase()}/dashboard`} replace />;
  }

  return <Outlet />;
};
