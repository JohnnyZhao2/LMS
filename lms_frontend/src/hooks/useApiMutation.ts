/**
 * Custom hook for API mutations with toast notifications
 * Requirements: 23.1, 23.2, 23.3 - Unified loading indicators and error/success messages
 */

import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { ApiError, NetworkError } from '@/lib/api';

/**
 * Options for useApiMutation hook
 */
export interface UseApiMutationOptions<TData, TError, TVariables, TContext> 
    extends Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'onSuccess' | 'onError'> {
    /** Success message to display */
    successMessage?: string;
    /** Error message to display (overrides default) */
    errorMessage?: string;
    /** Whether to show success toast */
    showSuccessToast?: boolean;
    /** Whether to show error toast */
    showErrorToast?: boolean;
    /** Custom success handler */
    onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void;
    /** Custom error handler */
    onError?: (error: TError, variables: TVariables, context: TContext | undefined) => void;
}

/**
 * Get user-friendly error message from error object
 */
function getErrorMessage(error: unknown, defaultMessage?: string): string {
    if (error instanceof NetworkError) {
        return error.message;
    }
    
    if (error instanceof ApiError) {
        return error.message;
    }
    
    if (error instanceof Error) {
        return error.message;
    }
    
    return defaultMessage || '操作失败，请稍后重试';
}

/**
 * Custom hook for API mutations with automatic toast notifications
 * 
 * @example
 * ```tsx
 * const createTask = useApiMutation({
 *   mutationFn: (data) => api.post('/tasks', data),
 *   successMessage: '任务创建成功',
 *   onSuccess: () => {
 *     queryClient.invalidateQueries(['tasks']);
 *     navigate('/tasks');
 *   },
 * });
 * 
 * // Usage
 * createTask.mutate({ title: 'New Task' });
 * ```
 */
export function useApiMutation<
    TData = unknown,
    TError = Error,
    TVariables = void,
    TContext = unknown
>(
    options: UseApiMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
    const toast = useToast();
    
    const {
        successMessage,
        errorMessage,
        showSuccessToast = true,
        showErrorToast = true,
        onSuccess,
        onError,
        ...mutationOptions
    } = options;

    return useMutation({
        ...mutationOptions,
        onSuccess: (data, variables, context) => {
            // Show success toast if enabled and message provided
            if (showSuccessToast && successMessage) {
                toast.success(successMessage);
            }
            
            // Call custom success handler
            onSuccess?.(data, variables, context);
        },
        onError: (error, variables, context) => {
            // Show error toast if enabled
            if (showErrorToast) {
                const message = getErrorMessage(error, errorMessage);
                toast.error(message);
            }
            
            // Call custom error handler
            onError?.(error, variables, context);
        },
    });
}

/**
 * Hook for delete mutations with confirmation
 */
export interface UseDeleteMutationOptions<TData, TError, TVariables, TContext>
    extends UseApiMutationOptions<TData, TError, TVariables, TContext> {
    /** Item name for success message (e.g., "任务", "题目") */
    itemName?: string;
}

export function useDeleteMutation<
    TData = unknown,
    TError = Error,
    TVariables = void,
    TContext = unknown
>(
    options: UseDeleteMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
    const { itemName = '项目', successMessage, ...rest } = options;
    
    return useApiMutation({
        ...rest,
        successMessage: successMessage || `${itemName}已删除`,
    });
}

export { getErrorMessage };
