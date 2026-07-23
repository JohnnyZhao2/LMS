import {
  useQuery,
  type QueryClient,
} from '@tanstack/react-query';

import { questionsQueryKeys } from '@/features/assessment/api/questions-queries';
import { knowledgeQueryKeys } from '@/features/knowledge/api/knowledge-queries';
import {
  createTag,
  deleteTag,
  getTags,
  mergeTags,
  reorderSpaceTags,
  updateTag,
  type GetTagsParams,
} from '@/features/tags/api/tags-api';
import { tasksQueryKeys } from '@/features/tasks/api/tasks-queries';
import { useCurrentRole } from '@/hooks/use-current-role';
import { useAuth } from '@/lib/auth-context';
import { invalidateMany } from '@/lib/react-query/invalidate-many';
import { normalizeRoleKey, type QueryRole } from '@/lib/react-query/normalize-role-key';
import { useAppMutation } from '@/lib/react-query/use-app-mutation';

export const tagsQueryKeys = {
  all: () => ['tags'] as const,
  list: ({
    currentRole,
    canQueryTags,
    tagType,
    search,
    limit,
    applicableTo,
  }: {
    currentRole: QueryRole;
    canQueryTags: boolean;
    tagType?: string;
    search?: string;
    limit: number;
    applicableTo?: string;
  }) => [
    'tags',
    normalizeRoleKey(currentRole),
    canQueryTags,
    tagType,
    search,
    limit,
    applicableTo,
  ] as const,
} as const;

/**
 * 标签增删改后失效标签、题目、知识与任务资源选项相关缓存。
 */
export const invalidateAfterTagMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    tagsQueryKeys.all(),
    questionsQueryKeys.all(),
    questionsQueryKeys.detailRoot(),
    knowledgeQueryKeys.listRoot(),
    knowledgeQueryKeys.detailRoot(),
    tasksQueryKeys.resourceOptionsRoot(),
  ]);

export const useTags = (params: GetTagsParams = {}) => {
  const currentRole = useCurrentRole();
  const { hasCapability, isLoading: isAuthLoading } = useAuth();
  const { tag_type, search, limit = 50, applicable_to } = params;
  const canViewTags = hasCapability('tag.view');
  const canViewKnowledgeSpaces = tag_type === 'SPACE' && hasCapability('knowledge.view');
  const canQueryTags = canViewTags || canViewKnowledgeSpaces;

  return useQuery({
    queryKey: tagsQueryKeys.list({
      currentRole,
      canQueryTags,
      tagType: tag_type,
      search,
      limit,
      applicableTo: applicable_to,
    }),
    queryFn: () => getTags({ tag_type, search, limit, applicable_to }),
    staleTime: 2 * 60 * 1000,
    enabled: currentRole !== null && !isAuthLoading && canQueryTags,
  });
};

export const useCreateTag = () => useAppMutation(createTag, invalidateAfterTagMutation);

export const useUpdateTag = () => useAppMutation(updateTag, invalidateAfterTagMutation);

export const useDeleteTag = () => useAppMutation(deleteTag, invalidateAfterTagMutation);

export const useMergeTag = () => useAppMutation(mergeTags, invalidateAfterTagMutation);

export const useReorderSpaceTags = () =>
  useAppMutation(reorderSpaceTags, invalidateAfterTagMutation);
