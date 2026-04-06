import { useTags, useCreateTag, useDeleteTag, useUpdateTag } from '@/features/tags/api/tags';

/**
 * 获取 space 列表
 */
export const useSpaceTypeTags = (search?: string) => {
  return useTags({ tag_type: 'SPACE', search });
};

export const useScopedTags = (
  applicableTo: 'knowledge' | 'question',
  search?: string,
) => {
  return useTags({ tag_type: 'TAG', search, applicable_to: applicableTo });
};

export { useTags, useCreateTag, useDeleteTag, useUpdateTag };
