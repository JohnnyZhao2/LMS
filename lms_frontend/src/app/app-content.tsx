import { AppRouter } from './router';
import { AppLayout } from '@/components/layouts';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { RoleSwitchOverlay } from '@/features/auth/components/role-switch-overlay';

/**
 * 应用内容组件（在 Provider 内部）
 */
export const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, isSwitching } = useAuth();
  const location = useLocation();

  // 只有在既没有登录信息，又正在加载时，才显示全屏加载
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
      {content}
      <RoleSwitchOverlay isSwitching={isSwitching || false} />
    </>
  );
};

