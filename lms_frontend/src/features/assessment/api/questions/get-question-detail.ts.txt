import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { Question } from '@/types/question';

export const getQuestion = (id: number) => apiClient.get<Question>(`/questions/${id}/`);

export const useQuestionDetail = (id: number) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: queryKeys.questions.detail({ currentRole, id }),
    queryFn: () => getQuestion(id),
    enabled: Boolean(id) && currentRole !== null,
  });
};
