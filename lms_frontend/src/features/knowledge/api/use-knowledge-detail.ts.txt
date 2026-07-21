import { useQuery } from '@tanstack/react-query';

import { getKnowledgeDetail } from '@/features/knowledge/api/get-knowledge-detail';
import { getTaskKnowledgeDetail } from '@/features/knowledge/api/get-task-knowledge-detail';
import { useCurrentRole } from '@/hooks/use-current-role';
import { queryKeys } from '@/lib/query-keys';

interface UseKnowledgeDetailParams {
  knowledgeId?: number;
  taskKnowledgeId?: number;
}

export const useKnowledgeDetail = ({ knowledgeId, taskKnowledgeId }: UseKnowledgeDetailParams) => {
  const currentRole = useCurrentRole();
  const detailId = taskKnowledgeId ?? knowledgeId ?? 0;

  return useQuery({
    queryKey: queryKeys.knowledge.detail({ currentRole, knowledgeId, taskKnowledgeId }),
    queryFn: () =>
      taskKnowledgeId
        ? getTaskKnowledgeDetail(taskKnowledgeId)
        : getKnowledgeDetail(knowledgeId!),
    enabled: Boolean(detailId) && currentRole !== null,
  });
};
