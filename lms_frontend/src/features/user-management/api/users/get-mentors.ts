import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { Mentor } from '@/types/common';

export const getMentors = () => apiClient.get<Mentor[]>('/users/mentors/');

export const useMentors = () => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: queryKeys.users.mentors(currentRole),
    queryFn: getMentors,
    enabled: currentRole !== null,
  });
};
