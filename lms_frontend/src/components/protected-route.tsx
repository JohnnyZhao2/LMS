import { Navigate, useParams } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { ROUTES } from '@/config/routes';
import type { RoleCode } from '@/types/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: RoleCode[];
}

/**
 * 路由守卫组件
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { role: urlRole } = useParams<{ role: string }>();

  // 从 URL 获取当前角色
  const currentRole = urlRole?.toUpperCase() as RoleCode | undefined;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // 权限检查：如果当前角色不在允许的角色列表中，重定向到当前角色的 dashboard
  if (allowedRoles && currentRole && !allowedRoles.includes(currentRole)) {
    const dashboardPath = urlRole ? `/${urlRole.toLowerCase()}/dashboard` : '/dashboard';
    return <Navigate to={dashboardPath} replace />;
  }

  return <>{children}</>;
};
