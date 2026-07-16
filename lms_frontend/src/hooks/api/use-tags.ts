import { useQuery } from '@tanstack/react-query';

import { useCurrentRole } from '@/hooks/use-current-role';
import { apiClient } from '@/lib/api-client';
import { buildQueryString } from '@/lib/api-utils';
import { useAuth } from '@/lib/auth-context';
import { queryKeys } from '@/lib/query-keys';
import type { Tag, TagType } from '@/types/common';

export interface GetTagsParams {
  tag_type?: TagType;
  search?: string;
  limit?: number;
  applicable_to?: 'knowledge' | 'question';
}

export const getTags = ({
  tag_type,
  search,
  limit = 50,
  applicable_to,
}: GetTagsParams = {}) =>
  apiClient.get<Tag[]>(
    `/tags/${buildQueryString({ tag_type, search, limit, applicable_to })}`,
  );

export const useTags = (params: GetTagsParams = {}) => {
  const currentRole = useCurrentRole();
  const { hasCapability, isLoading: isAuthLoading } = useAuth();
  const { tag_type, search, limit = 50, applicable_to } = params;
  const canViewTags = hasCapability('tag.view');
  const canViewKnowledgeSpaces = tag_type === 'SPACE' && hasCapability('knowledge.view');
  const canQueryTags = canViewTags || canViewKnowledgeSpaces;

  return useQuery({
    queryKey: queryKeys.tags.list({
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
