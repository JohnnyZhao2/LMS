import type { ComponentType } from 'react';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import type { Tag, TagType } from '@/types/common';
import type { TagMutationPayload } from '@/types/tag-api';

export interface KnowledgeGetTagsParams {
  tag_type?: TagType;
  search?: string;
  limit?: number;
  applicable_to?: 'knowledge';
}

export interface KnowledgeTagInputProps {
  applicableTo: 'knowledge';
  selectedTags: { id: number; name?: string }[];
  onAdd: (tag: { id: number; name: string }) => void;
  onRemove: (tagId: number) => void;
  hideChips?: boolean;
  extendScope?: boolean;
}

export interface KnowledgeTagAssignmentSectionProps {
  applicableTo: 'knowledge';
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

export interface KnowledgeSpaceTagQuickCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'create' | 'edit';
  initialName?: string;
  initialColor?: string;
  onSubmit: (payload: { name: string; color: string }) => Promise<void> | void;
  isSubmitting?: boolean;
}

/** Knowledge 所需的 Tag 能力契约，由 app 路由层注入实现 */
export interface KnowledgeTagDeps {
  useTags: (params?: KnowledgeGetTagsParams) => UseQueryResult<Tag[], Error>;
  useCreateTag: () => UseMutationResult<Tag, Error, TagMutationPayload, unknown>;
  useDeleteTag: () => UseMutationResult<unknown, Error, number, unknown>;
  TagInput: ComponentType<KnowledgeTagInputProps>;
  TagAssignmentSection: ComponentType<KnowledgeTagAssignmentSectionProps>;
  SpaceTagQuickCreateDialog: ComponentType<KnowledgeSpaceTagQuickCreateDialogProps>;
}
