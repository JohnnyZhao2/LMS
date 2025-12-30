import { Navigate } from 'react-router-dom';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/features/auth/hooks/use-auth';
import type { RoleCode } from '@/types/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: RoleCode[];
}

/**
 * 路由守卫组件
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, currentRole } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && currentRole && !allowedRoles.includes(currentRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

