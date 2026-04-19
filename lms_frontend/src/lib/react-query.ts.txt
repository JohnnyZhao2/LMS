import { QueryClient } from '@tanstack/react-query';
import { showApiError } from '@/utils/error-handler';

/**
 * React Query 客户端配置
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: 'always',
      staleTime: 0,
    },
    mutations: {
      onError: (error) => {
        showApiError(error);
      },
    },
  },
});
