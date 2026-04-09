import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/react-query';
import { AuthProvider } from '@/features/auth/stores/auth-context';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import dayjs from '@/lib/dayjs';
import 'dayjs/locale/zh-cn';

// 配置 dayjs 中文
dayjs.locale('zh-cn');

/**
 * 全局 Provider
 * 使用 ShadCN UI + Tailwind CSS 设计系统
 */
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          {children}
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};
