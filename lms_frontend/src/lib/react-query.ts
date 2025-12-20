import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';
import { showApiError } from '@/utils/error-handler';

/**
 * React Query 客户端配置
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 分钟
    },
    mutations: {
      onError: (error) => {
        showApiError(error);
      },
    },
  },
});

