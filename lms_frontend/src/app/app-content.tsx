import { useAuth } from '@/session/auth/auth-context';
import { Outlet, useLocation } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { AppLayout } from '@/app/layouts/app-layout';
import { StudentLayout } from '@/app/layouts/student-layout';
import { useWorkbench } from '@/session/hooks/use-workbench';

/**
 * 应用内容组件（在 Provider 内部）
 */
export const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const workbench = useWorkbench();

  if (isLoading && !isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-muted">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent" />
          <span className="text-sm font-bold text-text-muted tracking-wider">SECURE_CONNECTING...</span>
        </div>
      </div>
    );
  }

  const isLoginPage = location.pathname === ROUTES.LOGIN;
  const Layout = workbench === 'learn' ? StudentLayout : AppLayout;

  if (isAuthenticated && !isLoginPage) {
    return (
      <Layout>
        <Outlet />
      </Layout>
    );
  }

  return <Outlet />;
};
