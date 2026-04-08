import { Navigate, useParams } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { ROUTES } from '@/config/routes';
import { getAccessibleWorkspaceHome, normalizeRoleCode } from '@/app/workspace-config';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  permissionMode?: 'all' | 'any';
}

/**
 * 路由守卫组件
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions,
  permissionMode = 'all',
}) => {
  const { isAuthenticated, isLoading, availableRoles, currentRole, hasAnyCapability, hasCapability } = useAuth();
  const { role: urlRole } = useParams<{ role: string }>();

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

  const hasRequiredPermissions = !requiredPermissions || requiredPermissions.length === 0
    ? true
    : permissionMode === 'any'
      ? hasAnyCapability(requiredPermissions)
      : requiredPermissions.every((permissionCode) => hasCapability(permissionCode));

  if (!hasRequiredPermissions) {
    const fallbackPath = getAccessibleWorkspaceHome(
      availableRoles.map((role) => role.code),
      hasCapability,
      normalizeRoleCode(urlRole) ?? currentRole,
    ) ?? ROUTES.LOGIN;
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};
