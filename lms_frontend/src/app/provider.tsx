import { QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { queryClient } from '@/lib/react-query';
import { AuthProvider } from '@/features/auth/stores/auth-context';
import dayjs from '@/lib/dayjs';
import 'dayjs/locale/zh-cn';

// 配置 dayjs 中文
dayjs.locale('zh-cn');

/**
 * 全局 Provider
 */
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 6,
            fontFamily: '"PingFang SC", "Source Han Sans SC", "Microsoft YaHei", sans-serif',
          },
        }}
      >
        <AuthProvider>{children}</AuthProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
};
