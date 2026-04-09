import { useTags } from '@/features/tags/api/tags';

/**
 * 获取 space 列表
 */
export const useSpaceTypeTags = (search?: string) => {
  return useTags({ tag_type: 'SPACE', search });
};
