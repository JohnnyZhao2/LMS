import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { invalidateAfterUserMutation } from '@/lib/cache-invalidation/users';
import type { UserList } from '@/types/common';

export const assignMentor = ({ id, mentorId }: { id: number; mentorId: number | null }) =>
  apiClient.post<UserList>(`/users/${id}/assign-mentor/`, { mentor_id: mentorId });

export const useAssignMentor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignMentor,
    onSuccess: () => invalidateAfterUserMutation(queryClient, { includeAssignableUsers: true }),
  });
};
