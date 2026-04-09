import { LoginForm } from '@/features/auth/components/login-form';
import { AuthLayout } from '@/components/layouts/auth-layout';

type ThemeCssVariables = React.CSSProperties & Record<`--${string}`, string>;

/**
 * 登录页面
 * 使用 AuthLayout 提供统一且精致的视觉背景
 */
export const LoginPage: React.FC = () => {
  const loginThemeVariables: ThemeCssVariables = {
    '--theme-primary': '#C41230',
    '--theme-primary-hover': '#A30F28',
    '--theme-background': '#FFFBF5',
    '--theme-foreground': '#1A1A1A',
    '--theme-muted': '#F5F0E8',
    '--theme-border': '#E8DFD0',
    '--color-primary': '#C41230',
    '--theme-radius-sm': '2px',
    '--theme-radius-md': '4px',
    '--theme-radius-lg': '6px',
  };

  return (
    <div 
      className="min-h-screen w-full relative auth-page-scope"
      style={loginThemeVariables}
    >
      <AuthLayout
        title="欢迎回来"
        description="请登录您的账号以继续"
      >
        <LoginForm />
      </AuthLayout>
    </div>
  );
};

export default LoginPage;
