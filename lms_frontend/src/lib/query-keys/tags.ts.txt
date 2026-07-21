import { normalizeRoleKey, type QueryRole } from '@/lib/query-keys/shared';

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
