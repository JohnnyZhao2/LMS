import { LoginForm } from '@/features/auth/components/login-form';
import { AuthLayout } from '@/components/layouts/auth-layout';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/session/auth/auth-context';
import { getAccessibleWorkspaceHome } from '@/session/workspace/role-paths';
import { Navigate, useSearchParams } from 'react-router-dom';

/**
 * 登录页面
 * 使用 AuthLayout 提供统一且精致的视觉背景
 */
export const LoginPage: React.FC = () => {
  const { isAuthenticated, isLoading, availableRoles, currentRole } = useAuth();
  const [searchParams] = useSearchParams();
  const callbackCode = searchParams.get('code');

  if (!callbackCode && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!callbackCode && isAuthenticated) {
    const workspaceHome = getAccessibleWorkspaceHome(
      availableRoles.map((role) => role.code),
      currentRole,
    );

    if (workspaceHome) {
      return <Navigate to={workspaceHome} replace />;
    }
  }

  return (
    <div className="min-h-screen w-full relative auth-page-scope">
      <AuthLayout
        title="欢迎回来"
        description="请登录您的账号以继续"
      >
        <LoginForm />
      </AuthLayout>
    </div>
  );
};
