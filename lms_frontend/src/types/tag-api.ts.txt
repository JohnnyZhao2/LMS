import type { TagType } from '@/types/common';

export interface TagMutationPayload {
  name: string;
  tag_type: TagType;
  color?: string;
  sort_order?: number;
  allow_knowledge?: boolean;
  allow_question?: boolean;
  current_module?: 'knowledge' | 'question';
  extend_scope?: boolean;
}

export interface MergeTagPayload {
  source_tag_ids: number[];
  merged_name: string;
}

export interface ReorderSpaceTagsPayload {
  ordered_tag_ids: number[];
}
