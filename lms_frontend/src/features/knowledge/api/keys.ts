/**
 * Knowledge Query Keys
 * React Query keys for knowledge data caching
 * @module features/knowledge/api/keys
 */

import type { KnowledgeFilterParams } from '@/types/api';

/**
 * Query keys for React Query
 */
export const knowledgeKeys = {
  all: ['knowledge'] as const,
  lists: () => [...knowledgeKeys.all, 'list'] as const,
  list: (params: KnowledgeFilterParams) => [...knowledgeKeys.lists(), params] as const,
  details: () => [...knowledgeKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...knowledgeKeys.details(), id] as const,
  categories: () => [...knowledgeKeys.all, 'categories'] as const,
  categoryChildren: (primaryId: number | string) => [...knowledgeKeys.categories(), 'children', primaryId] as const,
};
