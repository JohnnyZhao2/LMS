import { Navigate, Outlet } from 'react-router-dom';

import { canAccessBusinessRoute } from '@/app/route-registry';
import { Spinner } from '@/components/ui/spinner';
import { ROUTES } from '@/config/routes';
import { useWorkbench } from '@/hooks/use-workbench';
import { useAuth } from '@/lib/auth';
import type { Workbench } from '@/types/common';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  permissionMode?: 'all' | 'any';
  workbenches?: Workbench[];
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
  workbenches,
}) => {
  const { hasCapability } = useAuth();
  const workbench = useWorkbench();

  if (!canAccessBusinessRoute({ workbenches, requiredPermissions, permissionMode }, workbench, hasCapability)) {
    return <Navigate to={ROUTES.FORBIDDEN} replace />;
  }

  return children;
};
