import {
  useInfiniteQuery,
  useQuery,
  type QueryClient,
} from '@tanstack/react-query';

import {
  createKnowledge,
  deleteKnowledge,
  getKnowledgeDetail,
  getKnowledgeList,
  getTaskKnowledgeDetail,
  incrementViewCount,
  parseDocument,
  updateKnowledge,
  type GetKnowledgeListParams,
} from '@/features/knowledge/api/knowledge-api';
import { tasksQueryKeys } from '@/features/tasks/api/tasks-queries';
import { useCurrentRole } from '@/hooks/use-current-role';
import { invalidateMany } from '@/lib/react-query/invalidate-many';
import { normalizeRoleKey, type QueryRole } from '@/lib/react-query/normalize-role-key';
import { useAppMutation } from '@/lib/react-query/use-app-mutation';
import type { KnowledgeDetail } from '@/types/knowledge';

export const knowledgeQueryKeys = {
  listRoot: () => ['knowledge-list'] as const,
  infiniteList: ({
    currentRole,
    spaceTagId,
    tagId,
    search,
    pageSize,
  }: {
    currentRole: QueryRole;
    spaceTagId?: number;
    tagId?: number;
    search?: string;
    pageSize: number;
  }) => [
    'knowledge-list',
    'infinite',
    normalizeRoleKey(currentRole),
    spaceTagId,
    tagId,
    search,
    pageSize,
  ] as const,
  detailRoot: () => ['knowledge-detail'] as const,
  detail: ({
    currentRole,
    knowledgeId,
    taskKnowledgeId,
  }: {
    currentRole: QueryRole;
    knowledgeId?: number;
    taskKnowledgeId?: number;
  }) => [
    'knowledge-detail',
    normalizeRoleKey(currentRole),
    taskKnowledgeId ? 'task' : 'knowledge',
    taskKnowledgeId ?? knowledgeId ?? 0,
  ] as const,
} as const;

/**
 * 知识增删改后失效列表、详情与任务资源选项缓存。
 */
export const invalidateAfterKnowledgeMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [
    knowledgeQueryKeys.listRoot(),
    knowledgeQueryKeys.detailRoot(),
    tasksQueryKeys.resourceOptionsRoot(),
  ]);

/**
 * 阅读次数变更后仅失效列表缓存。
 */
export const invalidateAfterKnowledgeViewMutation = (queryClient: QueryClient) =>
  invalidateMany(queryClient, [knowledgeQueryKeys.listRoot()]);

interface UseKnowledgeDetailParams {
  knowledgeId?: number;
  taskKnowledgeId?: number;
}

/**
 * 获取知识详情（支持任务内知识与独立知识两种入口）
 */
export const useKnowledgeDetail = ({ knowledgeId, taskKnowledgeId }: UseKnowledgeDetailParams) => {
  const currentRole = useCurrentRole();
  const detailId = taskKnowledgeId ?? knowledgeId ?? 0;

  return useQuery({
    queryKey: knowledgeQueryKeys.detail({ currentRole, knowledgeId, taskKnowledgeId }),
    queryFn: () =>
      taskKnowledgeId
        ? getTaskKnowledgeDetail(taskKnowledgeId)
        : getKnowledgeDetail(knowledgeId!),
    enabled: Boolean(detailId) && currentRole !== null,
  });
};

export const useInfiniteKnowledgeList = (params: GetKnowledgeListParams = {}) => {
  const currentRole = useCurrentRole();
  const { space_tag_id, tag_id, search, pageSize = 20 } = params;

  return useInfiniteQuery({
    queryKey: knowledgeQueryKeys.infiniteList({
      currentRole,
      spaceTagId: space_tag_id,
      tagId: tag_id,
      search,
      pageSize,
    }),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getKnowledgeList(params, Number(pageParam)),
    getNextPageParam: (lastPage) =>
      lastPage.current_page < lastPage.total_pages ? lastPage.current_page + 1 : undefined,
    enabled: currentRole !== null,
  });
};

export const useCreateKnowledge = () =>
  useAppMutation(createKnowledge, invalidateAfterKnowledgeMutation);

export const useUpdateKnowledge = () =>
  useAppMutation(updateKnowledge, (qc, updatedKnowledge) => {
    qc.setQueriesData<KnowledgeDetail>(
      { queryKey: knowledgeQueryKeys.detailRoot() },
      (cachedKnowledge) => {
        if (!cachedKnowledge || cachedKnowledge.id !== updatedKnowledge.id) {
          return cachedKnowledge;
        }
        return { ...cachedKnowledge, ...updatedKnowledge };
      },
    );
    return invalidateAfterKnowledgeMutation(qc);
  });

export const useDeleteKnowledge = () =>
  useAppMutation(deleteKnowledge, invalidateAfterKnowledgeMutation);

/**
 * 增加知识阅读次数，并乐观更新详情缓存中的 view_count。
 */
export const useIncrementViewCount = () =>
  useAppMutation(
    async (id: number) => {
      const response = await incrementViewCount(id);
      return { id, view_count: response.view_count };
    },
    (qc, result) => {
      qc.setQueriesData<KnowledgeDetail>(
        { queryKey: knowledgeQueryKeys.detailRoot() },
        (old) => {
          if (!old || old.id !== result.id) {
            return old;
          }
          return { ...old, view_count: result.view_count };
        },
      );
      return invalidateAfterKnowledgeViewMutation(qc);
    },
  );

export const useParseDocument = () => useAppMutation(parseDocument);
