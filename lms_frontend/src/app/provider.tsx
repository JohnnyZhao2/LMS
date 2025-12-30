import { QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { queryClient } from '@/lib/react-query';
import { AuthProvider } from '@/features/auth/stores/auth-context';
import { appTheme } from '@/config/theme';
import { Toaster } from '@/components/ui/sonner';
import dayjs from '@/lib/dayjs';
import 'dayjs/locale/zh-cn';

// 配置 dayjs 中文
dayjs.locale('zh-cn');

/**
 * 全局 Provider
 * 使用新设计系统主题
 */
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={zhCN} theme={appTheme}>
        <AntApp>
          <AuthProvider>
            {children}
            <Toaster position="top-center" richColors />
          </AuthProvider>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
};
