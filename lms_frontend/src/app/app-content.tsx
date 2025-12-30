import { AppRouter } from './router';
import { AppLayout } from '@/components/layouts';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { ClayBackground } from '@/components/layout/clay-background';

/**
 * 应用内容组件（在 Provider 内部）
 */
export const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  // 登录页不需要布局
  const isLoginPage = location.pathname === ROUTES.LOGIN;

  const content = (isAuthenticated && !isLoginPage) ? (
    <AppLayout>
      <AppRouter />
    </AppLayout>
  ) : (
    <AppRouter />
  );

  return (
    <>
      <ClayBackground />
      {content}
    </>
  );
};

