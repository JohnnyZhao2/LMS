import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { QuizDetail } from '@/types/quiz';

export const getQuiz = (id: number) => apiClient.get<QuizDetail>(`/quizzes/${id}/`);

export const useQuizDetail = (id: number) => {
  const currentRole = useCurrentRole();
  return useQuery({
    queryKey: queryKeys.quizzes.detail({ currentRole, id }),
    queryFn: () => getQuiz(id),
    enabled: Boolean(id) && currentRole !== null,
  });
};
