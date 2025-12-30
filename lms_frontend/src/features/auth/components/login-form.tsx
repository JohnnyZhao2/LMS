import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { User, Lock, ArrowRight, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuth } from '../hooks/use-auth';
import { ROUTES } from '@/config/routes';
import { ApiError } from '@/lib/api-client';

// Zod 验证 schema
const loginSchema = z.object({
  employee_id: z.string().min(1, '请输入工号'),
  password: z.string().min(1, '请输入密码'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * 登录表单组件
 * 使用 ShadCN UI + React Hook Form + Zod 验证
 * 保持原有的现代化设计风格
 */
export const LoginForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      employee_id: '',
      password: '',
    },
  });

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      await login(values);
      toast.success('登录成功');
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status !== 401 && error.status !== 403) {
          const errorData = error.data as { message?: string; detail?: string };
          const errorMessage = errorData?.message || errorData?.detail || '登录失败，请检查工号和密码';
          toast.error(errorMessage);
        } else {
          toast.error('登录失败，请检查工号和密码');
        }
      } else {
        toast.error('网络错误，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex justify-center items-center min-h-screen p-6 relative overflow-hidden"
      style={{ background: 'var(--color-gray-900)' }}
    >
      {/* 动态背景 - 渐变光晕 */}
      <div
        className="absolute inset-0 animate-pulse"
        style={{
          background: `
            radial-gradient(ellipse 80% 80% at 20% 10%, rgba(77, 108, 255, 0.4) 0%, transparent 50%),
            radial-gradient(ellipse 60% 60% at 80% 30%, rgba(155, 0, 255, 0.3) 0%, transparent 50%),
            radial-gradient(ellipse 50% 50% at 50% 90%, rgba(255, 61, 143, 0.25) 0%, transparent 50%)
          `,
          animationDuration: '8s',
        }}
      />

      {/* 网格背景 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />

      {/* 登录卡片 */}
      <div
        className="relative w-full max-w-[440px] rounded-2xl animate-scaleIn"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: `
            0 0 0 1px rgba(255, 255, 255, 0.1),
            0 25px 50px -12px rgba(0, 0, 0, 0.4),
            0 0 100px rgba(77, 108, 255, 0.15)
          `,
          padding: '40px',
        }}
      >
        {/* Logo 和标题 */}
        <div className="text-center mb-8 animate-fadeInDown">
          {/* Logo */}
          <div
            className="w-[72px] h-[72px] mx-auto mb-5 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-purple-500) 100%)',
              boxShadow: '0 10px 40px rgba(77, 108, 255, 0.4)',
            }}
          >
            <span className="text-white text-[32px] font-bold">L</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            LMS 学习管理系统
          </h2>
          <p className="text-gray-500">
            欢迎回来，请登录您的账号
          </p>
        </div>

        {/* 表单 */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="space-y-5">
              <FormField
                control={form.control}
                name="employee_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 font-semibold text-sm">工号</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                        <Input
                          placeholder="请输入工号"
                          style={{
                            paddingLeft: '44px',
                            height: '48px',
                            fontSize: '14px',
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb',
                          }}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 font-semibold text-sm">密码</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                        <Input
                          type="password"
                          placeholder="请输入密码"
                          style={{
                            paddingLeft: '44px',
                            height: '48px',
                            fontSize: '14px',
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb',
                          }}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-8">
              <Button
                type="submit"
                className="w-full h-[52px] text-base font-semibold rounded-xl flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-600) 100%)',
                  boxShadow: '0 4px 14px rgba(77, 108, 255, 0.4)',
                }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    登录中...
                  </>
                ) : (
                  <>
                    登录系统
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* 底部装饰 */}
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} LMS 学习管理系统
          </p>
        </div>
      </div>

      {/* 底部装饰文字 */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
          Designed with ❤️ for better learning
        </p>
      </div>
    </div>
  );
};
