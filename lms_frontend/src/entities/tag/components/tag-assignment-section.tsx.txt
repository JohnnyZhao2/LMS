import * as React from 'react';
import { Plus, X } from 'lucide-react';

import { TagInput } from '@/entities/tag/components/tag-input';

interface TagAssignmentSectionProps {
  applicableTo: 'knowledge' | 'question';
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

export const TagAssignmentSection: React.FC<TagAssignmentSectionProps> = ({
  applicableTo,
  title = '标签',
  canEdit = true,
  selectedTags,
  expanded,
  onExpandedChange,
  onAdd,
  onRemove,
  labelClassName = 'mb-[10px] text-[10px] font-bold uppercase tracking-[0.1em] text-[#a0a8b0]',
  addButtonClassName = 'inline-flex items-center gap-1 rounded-[100px] bg-[#e8793a] px-[14px] py-[5px] text-[12px] font-semibold text-white transition hover:bg-[#d66b2e]',
  tagsWrapClassName = 'flex flex-wrap items-center gap-[7px]',
  tagClassName = 'inline-flex items-center gap-[5px] rounded-[100px] bg-[#e0e3e8] px-[11px] py-1 text-[12px] text-[#555]',
  removeButtonClassName = 'ml-[2px] text-[#98a4b5] transition hover:text-[#666]',
}) => (
  <div className="mb-[18px]">
    <p className={labelClassName}>{title}</p>
    {canEdit && expanded ? (
      <TagInput
        applicableTo={applicableTo}
        selectedTags={selectedTags}
        onAdd={onAdd}
        onRemove={onRemove}
        hideChips
      />
    ) : null}

    <div className={tagsWrapClassName}>
      {canEdit ? (
        <button
          type="button"
          onClick={() => onExpandedChange(!expanded)}
          className={addButtonClassName}
        >
          <Plus className="h-3 w-3" strokeWidth={2.2} />
          添加标签
        </button>
      ) : null}
      {selectedTags.map((tag) => (
        <span key={tag.id} className={tagClassName}>
          {tag.name ?? `#${tag.id}`}
          {canEdit ? (
            <button
              type="button"
              onClick={() => onRemove(tag.id)}
              className={removeButtonClassName}
            >
              <X className="h-[10px] w-[10px]" />
            </button>
          ) : null}
        </span>
      ))}
    </div>
  </div>
);
