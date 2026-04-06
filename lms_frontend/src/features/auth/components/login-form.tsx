import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

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
import { ApiError } from '@/lib/api-client';
import { oidcApi } from '../api/oidc';

// Zod 验证 schema
const loginSchema = z.object({
  employee_id: z.string().min(1, '请输入工号'),
  password: z.string().min(1, '请输入密码'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * 登录表单组件 - 现代极致版
 * 设计理念：去容器化、重排版、细腻微交互
 */
export const LoginForm: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [oidcLoading, setOidcLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      employee_id: '',
      password: '',
    },
  });

  const handleOidcLogin = async () => {
    setOidcLoading(true);
    try {
      const result = await oidcApi.getAuthorizeUrl();
      sessionStorage.setItem('lms_oidc_state', result.state);
      window.location.href = result.authorize_url;
    } catch {
      toast.error('获取扫码登录地址失败');
      setOidcLoading(false);
    }
  };

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const currentRole = await login(values);
      toast.success('登录成功');
      const rolePath = `/${currentRole.toLowerCase()}/dashboard`;
      navigate(rolePath, { replace: true });
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
    <div className="w-full">
      <style dangerouslySetInnerHTML={{
        __html: `
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: var(--color-foreground);
          -webkit-box-shadow: 0 0 0px 1000px transparent inset;
          transition: background-color 5000s ease-in-out 0s;
        }
      ` }} />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-14"
        >
          <div className="space-y-12">
            <div>
              <FormField
                control={form.control}
                name="employee_id"
                render={({ field }) => (
                  <FormItem className="space-y-4 group">
                    <FormLabel className="flex items-center gap-3 text-[11px] font-black text-foreground/40 tracking-[0.3em]">
                      <span className="w-1 h-1 bg-primary/30" />
                      工号
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="请输入工号"
                          interactionStyle="minimal"
                          className="h-12 !bg-transparent !border-0 !border-b !border-foreground/10 !rounded-none !shadow-none focus-visible:ring-0 focus-visible:border-foreground/20 transition-all duration-300 placeholder:text-sm placeholder:font-normal placeholder:text-foreground/30 text-foreground font-bold text-lg px-0 peer"
                          {...field}
                        />
                        {/* 墨水跟随效果 - 底线 */}
                        <div className="absolute bottom-0 left-0 right-0 h-px bg-foreground/10" />
                        
                        {/* 墨水跟随效果 - 激活线 (聚焦时从左向右展开至全长) */}
                        <div 
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary origin-left transition-transform duration-500 ease-out shadow-[0_0_8px_rgba(196,18,48,0.4)] scale-x-0 peer-focus:scale-x-100"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold text-destructive mt-2 tracking-widest" />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-4 group">
                    <FormLabel className="flex items-center gap-3 text-[11px] font-black text-foreground/40 tracking-[0.3em]">
                      <span className="w-1 h-1 bg-primary/30" />
                      密码
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="password"
                          placeholder="请输入密码"
                          interactionStyle="minimal"
                          className="h-12 !bg-transparent !border-0 !border-b !border-foreground/10 !rounded-none !shadow-none focus-visible:ring-0 focus-visible:border-foreground/20 transition-all duration-300 placeholder:text-sm placeholder:font-normal placeholder:text-foreground/30 text-foreground font-bold text-lg px-0 peer"
                          {...field}
                        />
                        {/* 墨水跟随效果 - 底线 */}
                        <div className="absolute bottom-0 left-0 right-0 h-px bg-foreground/10" />
                        
                        {/* 墨水跟随效果 - 激活线 (聚焦时从左向右展开至全长) */}
                        <div 
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary origin-left transition-transform duration-500 ease-out shadow-[0_0_8px_rgba(196,18,48,0.4)] scale-x-0 peer-focus:scale-x-100"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold text-destructive mt-2 tracking-widest" />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-4">
            <Button
              type="submit"
              disabled={loading || oidcLoading}
              className="w-full h-12 !rounded-full border-none bg-[#C41230] text-white font-black text-sm tracking-[0.6em] soft-press shadow-[0_6px_16px_rgba(196,18,48,0.22)] hover:bg-[#A30F28] hover:shadow-[0_8px_20px_rgba(196,18,48,0.28)] focus-visible:ring-[#C41230]/20 focus-visible:ring-offset-0"
            >
              {loading ? '正在验证身份...' : '登录'}
            </Button>
            <div className="flex items-center gap-4 py-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-foreground/10 to-foreground/5" />
              <span className="text-[10px] font-bold tracking-[0.35em] text-foreground/24">或</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent via-foreground/10 to-foreground/5" />
            </div>
            <Button
              type="button"
              variant="ghost"
              disabled={loading || oidcLoading}
              onClick={handleOidcLogin}
              className="w-full h-12 !rounded-full border-none bg-[#F7E8EA] text-[#C41230] shadow-none hover:bg-[#F2DADD] hover:text-[#A30F28] focus-visible:ring-[#C41230]/16 focus-visible:ring-offset-0"
            >
              {oidcLoading ? '跳转扫码中...' : '扫码登录'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
