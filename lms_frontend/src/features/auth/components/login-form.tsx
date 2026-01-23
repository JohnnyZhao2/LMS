import { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
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
import { tokenStorage } from '@/lib/token-storage';

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
  const { login } = useAuth();
  const navigate = useNavigate();

  // 动画配置
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      }
    }
  } satisfies Variants;

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  } satisfies Variants;

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
      const currentRole = tokenStorage.getCurrentRole();
      const rolePath = currentRole ? `/${currentRole.toLowerCase()}/dashboard` : '/dashboard';
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
        <motion.form 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          onSubmit={form.handleSubmit(handleSubmit)} 
          className="space-y-14"
        >
          <div className="space-y-12">
            <motion.div variants={itemVariants}>
              <FormField
                control={form.control}
                name="employee_id"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel className="flex items-center gap-3 text-[11px] font-black text-gray-900/40 tracking-[0.3em]">
                      <span className="w-1 h-1 bg-primary/30" />
                      工号
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="请输入工号"
                          className="h-10 bg-transparent border-gray-900/5 rounded-none focus-visible:ring-0 focus-visible:border-transparent transition-all duration-300 placeholder:text-gray-900/10 text-gray-900 font-bold text-sm px-0 border-t-0 border-l-0 border-r-0 border-b-2"
                          {...field}
                        />
                        <motion.div
                          initial={{ scaleX: 0 }}
                          whileFocus={{ scaleX: 1 }}
                          transition={{ type: "spring", stiffness: 200, damping: 20 }}
                          className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary origin-left"
                          style={{ scaleX: form.watch('employee_id') ? 1 : undefined }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold text-destructive mt-2 tracking-widest" />
                  </FormItem>
                )}
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel className="flex items-center gap-3 text-[11px] font-black text-gray-900/40 tracking-[0.3em]">
                      <span className="w-1 h-1 bg-primary/30" />
                      密码
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="password"
                          placeholder="请输入密码"
                          className="h-10 bg-transparent border-gray-900/5 rounded-none focus-visible:ring-0 focus-visible:border-transparent transition-all duration-300 placeholder:text-gray-900/10 text-gray-900 font-bold text-sm px-0 border-t-0 border-l-0 border-r-0 border-b-2"
                          {...field}
                        />
                        <motion.div
                          initial={{ scaleX: 0 }}
                          whileFocus={{ scaleX: 1 }}
                          transition={{ type: "spring", stiffness: 200, damping: 20 }}
                          className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary origin-left"
                          style={{ scaleX: form.watch('password') ? 1 : undefined }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold text-destructive mt-2 tracking-widest" />
                  </FormItem>
                )}
              />
            </motion.div>
          </div>

          <motion.div variants={itemVariants} className="space-y-8">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-primary hover:bg-primary-600 text-white rounded-none font-black text-sm tracking-[0.8em] transition-all duration-300 active:scale-[0.98] border-none soft-press"
            >
              {loading ? "正在验证身份..." : "登录"}
            </Button>

            <div className="flex justify-between items-center py-2 px-1">
              <button
                type="button"
                className="text-[11px] font-bold text-gray-900/20 hover:text-primary transition-colors tracking-widest"
              >
                无法访问账号?
              </button>
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-1 h-1 bg-primary/10 rounded-full" />
                  <div className="w-1 h-1 bg-primary/20 rounded-full" />
                  <div className="w-1 h-1 bg-primary/30 rounded-full" />
                </div>
                <span className="text-[10px] font-bold text-gray-900/20 tracking-widest">安全链接已建立</span>
              </div>
            </div>
          </motion.div>
        </motion.form>
      </Form>
    </div>
  );
};
