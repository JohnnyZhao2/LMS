/**
 * Create User API
 * Creates a new user
 * @module features/user-mgmt/api/users/create-user
 * Requirements: 18.2 - Create user form
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { UserCreateRequest, UserDetail } from './types';
import { userKeys } from './keys';

/**
 * Create a new user
 * Requirements: 18.2 - Create user form
 * @param data - User creation data
 * @returns Created user
 */
export async function createUser(data: UserCreateRequest): Promise<UserDetail> {
  return api.post<UserDetail>(API_ENDPOINTS.users.create, data);
}

/**
 * Hook to create a new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
