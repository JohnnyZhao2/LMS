import { QueryClient } from '@tanstack/react-query';

/**
 * React Query 客户端配置
 * Mutation 错误由业务层 catch / onError 显式调用 showApiError，不在此全局弹 toast。
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: 'always',
      staleTime: 0,
    },
  },
});
