import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { invalidateAfterUserAuthorizationMutation } from '@/lib/cache-invalidation/authorization';
import { queryKeys } from '@/lib/query-keys';
import type { UserAuthorizationState } from '@/types/authorization';

interface ReplaceUserAuthorizationPayload {
  userId: number;
  data: UserAuthorizationState;
}

export const getUserAuthorization = (userId: number) =>
  apiClient.get<UserAuthorizationState>(`/authorization/users/${userId}/`);

export const useUserAuthorization = (
  userId: number | null,
  enabled = true,
) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: queryKeys.authorization.userAuthorization({ currentRole, userId }),
    queryFn: () => getUserAuthorization(userId!),
    enabled: currentRole !== null && Boolean(userId) && enabled,
  });
};

export const replaceUserAuthorization = ({
  userId,
  data,
}: ReplaceUserAuthorizationPayload) =>
  apiClient.put<UserAuthorizationState>(`/authorization/users/${userId}/`, data);

export const useReplaceUserAuthorization = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: replaceUserAuthorization,
    onSuccess: () => invalidateAfterUserAuthorizationMutation(queryClient),
  });
};

export const resetUserAuthorization = (userId: number) =>
  apiClient.post<UserAuthorizationState>(
    `/authorization/users/${userId}/reset-to-role/`,
  );

export const useResetUserAuthorization = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resetUserAuthorization,
    onSuccess: () => invalidateAfterUserAuthorizationMutation(queryClient),
  });
};
