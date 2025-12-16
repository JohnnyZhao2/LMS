import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { ApiError, NetworkError } from './api';

/**
 * Global error handler for queries
 * Requirements: 23.3 - Show clear error messages for API failures
 */
function handleQueryError(error: unknown): void {
  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Query error:', error);
  }
  
  // Network errors are handled by individual components
  // to allow for retry functionality
  if (error instanceof NetworkError) {
    return;
  }
  
  // API errors with specific status codes are handled by components
  if (error instanceof ApiError) {
    // 401 errors are handled by the API client (auto-refresh or redirect)
    if (error.status === 401) {
      return;
    }
    // Other errors are displayed by components
    return;
  }
}

/**
 * Global error handler for mutations
 * Requirements: 23.2, 23.3 - Show success/error messages for mutations
 */
function handleMutationError(error: unknown): void {
  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Mutation error:', error);
  }
  
  // Mutation errors are typically handled by the component
  // that triggered the mutation, using onError callback
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleQueryError,
  }),
  mutationCache: new MutationCache({
    onError: handleMutationError,
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        // Retry network errors and 5xx errors up to 2 times
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
