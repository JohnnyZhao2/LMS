import { LoginForm } from '@/features/auth/components/login-form';
import { AuthLayout } from '@/components/layouts/auth-layout';

/**
 * 登录页面
 * 使用 AuthLayout 提供统一且精致的视觉背景
 */
export const LoginPage: React.FC = () => {
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
