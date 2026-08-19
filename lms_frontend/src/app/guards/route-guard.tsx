import { Navigate, Outlet } from 'react-router-dom';

import { Spinner } from '@/components/ui/spinner';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/session/auth/auth-context';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  permissionMode?: 'all' | 'any';
}

export const RequireAuth: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
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
  const { hasCapability } = useAuth();

  const hasRequiredPermissions = !requiredPermissions?.length
    || (permissionMode === 'any'
      ? requiredPermissions.some(hasCapability)
      : requiredPermissions.every((permissionCode) => hasCapability(permissionCode)));

  if (!hasRequiredPermissions) {
    return <Navigate to={ROUTES.FORBIDDEN} replace />;
  }

  return children;
};
