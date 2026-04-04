import React from 'react';

import { TagInput } from '@/features/knowledge/components/shared/tag-input';
import { useTags } from '@/features/tags/api/tags';

interface QuestionTagInputProps {
  selectedTagIds: number[];
  onAdd: (tag: { id: number; name: string }) => void;
  onRemove: (tagId: number) => void;
}

export const QuestionTagInput: React.FC<QuestionTagInputProps> = ({
  selectedTagIds,
  onAdd,
  onRemove,
}) => {
  const { data: allTags = [] } = useTags({
    tag_type: 'TAG',
    applicable_to: 'question',
    limit: 200,
  });

  const selectedTags = React.useMemo(
    () => selectedTagIds
      .map((tagId) => allTags.find((tag) => tag.id === tagId))
      .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag))
      .map((tag) => ({ id: tag.id, name: tag.name })),
    [allTags, selectedTagIds],
  );

  return (
    <TagInput
      applicableTo="question"
      selectedTags={selectedTags}
      onAdd={onAdd}
      onRemove={onRemove}
      extendScope={false}
    />
  );
};
