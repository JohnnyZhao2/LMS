import { Navigate, Outlet } from 'react-router-dom';

import { Spinner } from '@/components/ui/spinner';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/session/auth/auth-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  permissionMode?: 'all' | 'any';
}

const RouteLoadingState = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Spinner size="lg" />
  </div>
);

export const RequireAuth: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <RouteLoadingState />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions,
  permissionMode = 'all',
}) => {
  const {
    isAuthenticated,
    isLoading,
    hasAnyCapability,
    hasCapability,
  } = useAuth();

  if (isLoading) {
    return <RouteLoadingState />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  const hasRequiredPermissions = !requiredPermissions?.length
    || (permissionMode === 'any'
      ? hasAnyCapability(requiredPermissions)
      : requiredPermissions.every((permissionCode) => hasCapability(permissionCode)));

  if (!hasRequiredPermissions) {
    return <Navigate to={ROUTES.FORBIDDEN} replace />;
  }

  return <>{children}</>;
};
