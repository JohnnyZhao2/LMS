/**
 * Assign Mentor API
 * Assigns mentor to a user
 * @module features/user-mgmt/api/users/assign-mentor
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';
import type { AssignMentorRequest, UserDetail } from './types';
import { userKeys } from './keys';

/**
 * Assign mentor to a user
 * @param id - User ID
 * @param data - Mentor to assign
 * @returns Updated user
 */
export async function assignMentor(id: number | string, data: AssignMentorRequest): Promise<UserDetail> {
  return api.post<UserDetail>(API_ENDPOINTS.users.assignMentor(id), data);
}

/**
 * Hook to assign mentor to a user
 */
export function useAssignMentor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: AssignMentorRequest }) => 
      assignMentor(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
    },
  });
}
