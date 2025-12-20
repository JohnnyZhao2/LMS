import { AppRouter } from './router';
import { AppLayout } from '@/components/layout/layout';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Spin } from 'antd';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '@/config/routes';

/**
 * 应用内容组件（在 Provider 内部）
 */
export const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  // 登录页不需要布局
  const isLoginPage = location.pathname === ROUTES.LOGIN;

  if (isAuthenticated && !isLoginPage) {
    return (
      <AppLayout>
        <AppRouter />
      </AppLayout>
    );
  }

  return <AppRouter />;
};

