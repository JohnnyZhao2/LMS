import {
  useMutation,
  useQueryClient,
  type MutationFunction,
  type QueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';

type InvalidateFn<TData, TVariables> = (
  queryClient: QueryClient,
  data: TData,
  variables: TVariables,
) => unknown | Promise<unknown>;

/**
 * mutationFn + 可选缓存失效，去掉各处重复的 useQueryClient / useMutation 包装。
 */
export function useAppMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  mutationFn: MutationFunction<TData, TVariables>,
  invalidate?: InvalidateFn<TData, TVariables>,
  options?: Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'>,
) {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options ?? {};

  return useMutation<TData, TError, TVariables, TContext>({
    ...rest,
    mutationFn,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await invalidate?.(queryClient, data, variables);
      await onSuccess?.(data, variables, onMutateResult, context);
    },
  });
}
