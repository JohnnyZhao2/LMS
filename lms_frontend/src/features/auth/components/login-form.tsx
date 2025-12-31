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
 * 扁平设计系统：无阴影、无渐变、纯色块设计
 * 使用 Outfit 字体，几何装饰形状，扁平交互反馈
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
      className="flex justify-center items-center min-h-screen p-6 relative overflow-hidden bg-[#F3F4F6]"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* 几何装饰形状 - 扁平设计系统 */}
      {/* 大圆形装饰 */}
      <div
        className="absolute rounded-full bg-white/5"
        style={{
          width: '600px',
          height: '600px',
          top: '-200px',
          right: '-200px',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute rounded-full bg-[#3B82F6]/5"
        style={{
          width: '400px',
          height: '400px',
          bottom: '-150px',
          left: '-150px',
        }}
        aria-hidden="true"
      />

      {/* 旋转正方形装饰 */}
      <div
        className="absolute bg-emerald-500/5"
        style={{
          width: '300px',
          height: '300px',
          top: '20%',
          left: '10%',
          transform: 'rotate(45deg)',
        }}
        aria-hidden="true"
      />

      {/* 渐变装饰（仅用于背景，不用于元素） */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, transparent 50%)',
        }}
        aria-hidden="true"
      />

      {/* 登录卡片 - 纯色块设计 */}
      <div className="relative w-full max-w-[440px] bg-white rounded-lg p-8">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          {/* Logo - 扁平设计 */}
          <div className="w-16 h-16 mx-auto mb-5 rounded-md bg-[#3B82F6] flex items-center justify-center">
            <span className="text-white text-3xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>
              L
            </span>
          </div>

          <h2
            className="text-2xl font-bold text-[#111827] mb-2"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            LMS 学习管理系统
          </h2>
          <p className="text-sm text-[#6B7280]" style={{ fontFamily: "'Outfit', sans-serif" }}>
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
                    <FormLabel
                      className="text-[#111827] font-semibold text-sm"
                      style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}
                    >
                      工号
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280] z-10" strokeWidth={2} />
                        <Input
                          placeholder="请输入工号"
                          className="bg-[#F3F4F6] border-0 rounded-md h-14 pl-12 text-[#111827] focus:bg-white focus:border-2 focus:border-[#3B82F6] focus:ring-0 transition-all duration-200"
                          style={{
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: '14px',
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
                    <FormLabel
                      className="text-[#111827] font-semibold text-sm"
                      style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}
                    >
                      密码
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#6B7280] z-10" strokeWidth={2} />
                        <Input
                          type="password"
                          placeholder="请输入密码"
                          className="bg-[#F3F4F6] border-0 rounded-md h-14 pl-12 text-[#111827] focus:bg-white focus:border-2 focus:border-[#3B82F6] focus:ring-0 transition-all duration-200"
                          style={{
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: '14px',
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
                className="w-full h-14 bg-[#3B82F6] text-white rounded-md font-semibold flex items-center justify-center gap-2 hover:bg-[#2563EB] hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 600,
                  fontSize: '16px',
                  boxShadow: 'none',
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
                    <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* 底部装饰 - 扁平分隔 */}
        <div className="mt-8 pt-6 text-center">
          <p
            className="text-sm text-[#9CA3AF]"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            © {new Date().getFullYear()} LMS 学习管理系统
          </p>
        </div>
      </div>
    </div>
  );
};
