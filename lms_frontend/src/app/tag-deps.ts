/**
 * app 层组装 Tags 实现，注入 Knowledge / Assessment 声明的能力契约。
 * 跨 feature 组合只允许发生在 app 层。
 */
import { useCreateTag } from '@/features/tags/api/create-tag';
import { useDeleteTag } from '@/features/tags/api/delete-tag';
import { useTags } from '@/features/tags/api/get-tags';
import { SpaceTagQuickCreateDialog } from '@/features/tags/components/space-tag-quick-create-dialog';
import { TagAssignmentSection } from '@/features/tags/components/tag-assignment-section';
import { TagInput } from '@/features/tags/components/tag-input';
import type { AssessmentTagDeps } from '@/features/assessment/types/tag-deps';
import type { KnowledgeTagDeps } from '@/features/knowledge/types/tag-deps';

export const knowledgeTagDeps: KnowledgeTagDeps = {
  useTags,
  useCreateTag,
  useDeleteTag,
  TagInput: TagInput as KnowledgeTagDeps['TagInput'],
  TagAssignmentSection: TagAssignmentSection as KnowledgeTagDeps['TagAssignmentSection'],
  SpaceTagQuickCreateDialog,
};

export const assessmentTagDeps: AssessmentTagDeps = {
  useTags,
  TagInput: TagInput as AssessmentTagDeps['TagInput'],
  TagAssignmentSection: TagAssignmentSection as AssessmentTagDeps['TagAssignmentSection'],
};
