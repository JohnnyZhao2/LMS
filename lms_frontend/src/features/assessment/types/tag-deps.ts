import type { ComponentType } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';

import type { Tag, TagType } from '@/types/common';

export interface AssessmentGetTagsParams {
  tag_type?: TagType;
  search?: string;
  limit?: number;
  applicable_to?: 'question';
}

export interface AssessmentTagInputProps {
  applicableTo: 'question';
  selectedTags: { id: number; name?: string }[];
  onAdd: (tag: { id: number; name: string }) => void;
  onRemove: (tagId: number) => void;
  hideChips?: boolean;
  extendScope?: boolean;
}

export interface AssessmentTagAssignmentSectionProps {
  applicableTo: 'question';
  title?: string;
  canEdit?: boolean;
  selectedTags: { id: number; name?: string }[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onAdd: (tag: { id: number; name: string }) => void;
  onRemove: (tagId: number) => void;
  labelClassName?: string;
  addButtonClassName?: string;
  tagsWrapClassName?: string;
  tagClassName?: string;
  removeButtonClassName?: string;
}

/** Assessment 所需的 Tag 能力契约，由 app 路由层注入实现 */
export interface AssessmentTagDeps {
  useTags: (params?: AssessmentGetTagsParams) => UseQueryResult<Tag[], Error>;
  TagInput: ComponentType<AssessmentTagInputProps>;
  TagAssignmentSection: ComponentType<AssessmentTagAssignmentSectionProps>;
}
