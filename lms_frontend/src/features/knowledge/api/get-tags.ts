import { useTags, useCreateTag, useDeleteTag, useUpdateTag } from '@/features/tags/api/tags';

/**
 * 获取 space 列表
 */
export const useSpaceTypeTags = (search?: string) => {
  return useTags({ tag_type: 'SPACE', search });
};

/**
 * 获取知识标签列表
 */
export const useKnowledgeTags = (search?: string) => {
  return useTags({ tag_type: 'TAG', search, applicable_to: 'knowledge' });
};

export const useScopedTags = (
  applicableTo: 'knowledge' | 'question',
  search?: string,
) => {
  return useTags({ tag_type: 'TAG', search, applicable_to: applicableTo });
};

export { useTags, useCreateTag, useDeleteTag, useUpdateTag };
