import React from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QUIET_OUTLINE_FIELD_CLASSNAME } from '@/components/ui/interactive-styles';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TagInput } from '@/features/knowledge/components/shared/tag-input';
import { getQuestionTypePresentation, QUESTION_TYPE_PICKER_OPTIONS } from '@/features/questions/constants';
import { CompactNumberInput } from '@/features/quiz-center/quizzes/components/compact-number-input';
import { cn } from '@/lib/utils';
import type { QuestionType, SimpleTag, Tag } from '@/types/api';

type MetaSpaceTag = Pick<SimpleTag, 'id' | 'name' | 'color'>;

const META_FIELD_CLASSNAME = 'h-7 rounded-md border-none bg-[color:color-mix(in_oklab,var(--color-primary-50)_68%,white)] text-[11px] font-medium shadow-none';
const STRIP_TRIGGER_CLASSNAME = `${QUIET_OUTLINE_FIELD_CLASSNAME} ${META_FIELD_CLASSNAME} px-2.5`;
const TAG_BUTTON_CLASSNAME = 'inline-flex h-7 items-center rounded-full border-[1.5px] border-black/8 bg-white/70 px-3 text-[10.5px] font-semibold tracking-[-0.01em] text-text-muted shadow-none backdrop-blur-[6px] transition-all';
const TYPE_TRIGGER_WIDTH_CLASSNAME = 'w-[96px]';
const SCORE_TRIGGER_WIDTH_CLASSNAME = 'w-[96px]';
const SPACE_TRIGGER_WIDTH_CLASSNAME = 'w-[96px]';

const getSpaceAccentColor = (space?: MetaSpaceTag | null) =>
  space?.color || 'color-mix(in oklab, var(--color-text-muted) 46%, white)';
const EMPTY_SPACE_ACCENT_COLOR = 'color-mix(in oklab, var(--color-text-muted) 36%, white)';

const TypeValue: React.FC<{ type: QuestionType }> = ({ type }) => {
  const { icon: Icon, label, color } = getQuestionTypePresentation(type);

  return (
    <span className="flex min-w-0 items-center gap-1.5 leading-none">
      <span className={cn('inline-flex h-4 w-4 shrink-0 items-center justify-center', color)}>
        <Icon className="h-3 w-3 shrink-0" strokeWidth={2.2} />
      </span>
      <span className="h-3.5 w-px shrink-0 bg-foreground/16" aria-hidden="true" />
      <span className="truncate text-[10.5px] font-semibold leading-none tracking-[-0.01em] text-text-muted">
        {label}
      </span>
    </span>
  );
};

const TypeItem: React.FC<{ type: QuestionType }> = ({ type }) => {
  const { icon: Icon, label, color } = getQuestionTypePresentation(type);

  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className={cn('inline-flex h-4 w-4 shrink-0 items-center justify-center', color)}>
        <Icon className="h-3 w-3 shrink-0" strokeWidth={2.2} />
      </span>
      <span className="h-3.5 w-px shrink-0 bg-border/80" aria-hidden="true" />
      <span className="truncate text-[12px] font-semibold tracking-[-0.01em] text-foreground/88">
        {label}
      </span>
    </span>
  );
};

const SpaceValue: React.FC<{ space?: MetaSpaceTag | null }> = ({ space }) => (
  <span className="flex min-w-0 items-center gap-1.5 leading-none">
    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
      <span
        className="inline-flex h-3 w-3 shrink-0 rounded-full border-[1.5px]"
        style={{ borderColor: space ? getSpaceAccentColor(space) : EMPTY_SPACE_ACCENT_COLOR }}
        aria-hidden="true"
      />
    </span>
    <span className="h-3.5 w-px shrink-0 bg-foreground/16" aria-hidden="true" />
    {space ? (
      <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold leading-none tracking-[-0.01em] text-text-muted">
        {space.name}
      </span>
    ) : (
      <span className="min-w-0 flex-1 text-[10.5px] font-semibold leading-none tracking-[-0.01em] text-text-muted" aria-hidden="true">
        ___
      </span>
    )}
  </span>
);

const SpaceItem: React.FC<{ space?: MetaSpaceTag | null }> = ({ space }) => (
  <span className="flex min-w-0 items-center gap-2.5">
    <span
      className="inline-flex h-3.5 w-3.5 shrink-0 rounded-full border-2"
      style={{ borderColor: space ? getSpaceAccentColor(space) : EMPTY_SPACE_ACCENT_COLOR }}
      aria-hidden="true"
    />
    {space ? (
      <>
        <span className="h-3.5 w-px shrink-0 bg-border/80" aria-hidden="true" />
        <span className="truncate text-[12px] font-semibold tracking-[-0.01em] text-foreground/88">
          {space.name}
        </span>
      </>
    ) : (
      <span className="text-[12px] font-semibold tracking-[-0.01em] text-foreground/88">未设置空间</span>
    )}
  </span>
);

interface QuestionMetaToolbarProps {
  questionType?: QuestionType;
  staticType?: boolean;
  onQuestionTypeChange?: (value: QuestionType) => void;
  score?: string;
  onScoreChange?: (value: string) => void;
  showType?: boolean;
  showScore?: boolean;
  showSpace?: boolean;
  showTags?: boolean;
  spaceTags?: Tag[];
  spaceTag?: MetaSpaceTag | null;
  spaceTagId?: number | null;
  onSpaceTagIdChange?: (value: number | null) => void;
  selectedTagIds?: number[];
  onTagAdd?: (tag: { id: number; name: string }) => void;
  onTagRemove?: (tagId: number) => void;
  leadingContent?: React.ReactNode;
  trailingContent?: React.ReactNode;
}

export const QuestionMetaToolbar: React.FC<QuestionMetaToolbarProps> = ({
  questionType,
  staticType = false,
  onQuestionTypeChange,
  score = '1',
  onScoreChange,
  showType = false,
  showScore = false,
  showSpace = false,
  showTags = false,
  spaceTags,
  spaceTag,
  spaceTagId,
  onSpaceTagIdChange,
  selectedTagIds = [],
  onTagAdd,
  onTagRemove,
  leadingContent,
  trailingContent,
}) => {
  const [tagPopoverOpen, setTagPopoverOpen] = React.useState(false);
  const currentSpace = spaceTag ?? spaceTags?.find((item) => item.id === spaceTagId) ?? null;

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto">
        {leadingContent}

        {showType && questionType ? (
          onQuestionTypeChange && !staticType ? (
            <Select
              value={questionType}
              onValueChange={(value) => onQuestionTypeChange(value as QuestionType)}
            >
              <SelectTrigger className={cn(STRIP_TRIGGER_CLASSNAME, TYPE_TRIGGER_WIDTH_CLASSNAME)}>
                <SelectValue>
                  <TypeValue type={questionType} />
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPE_PICKER_OPTIONS.map(({ value }) => (
                  <SelectItem key={value} value={value}>
                    <TypeItem type={value} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className={cn(STRIP_TRIGGER_CLASSNAME, TYPE_TRIGGER_WIDTH_CLASSNAME, 'flex items-center justify-between gap-2')}>
              <TypeValue type={questionType} />
            </div>
          )
        ) : null}

        {showScore ? (
          onScoreChange ? (
            <CompactNumberInput
              prefixLabel="分值"
              mode="integer"
              value={score}
              onChange={onScoreChange}
              min={0}
              max={100}
              step={1}
              prefixClassName="whitespace-nowrap text-text-muted !text-[10.5px]"
              inputWidthClassName="w-7"
              inputClassName="!text-[10.5px] leading-none !text-text-muted"
              className={`${SCORE_TRIGGER_WIDTH_CLASSNAME} gap-1 px-2.5 py-1 ${META_FIELD_CLASSNAME}`}
            />
          ) : (
            <div className={cn(STRIP_TRIGGER_CLASSNAME, SCORE_TRIGGER_WIDTH_CLASSNAME, 'flex items-center justify-between gap-2')}>
              <span className="truncate text-[10.5px] font-semibold leading-none tracking-[-0.01em] text-text-muted">
                分值 {score}
              </span>
            </div>
          )
        ) : null}

        {showSpace ? (
          onSpaceTagIdChange ? (
            <Select
              value={spaceTagId == null ? '__none__' : String(spaceTagId)}
              onValueChange={(value) => onSpaceTagIdChange(value === '__none__' ? null : Number(value))}
            >
              <SelectTrigger className={cn(STRIP_TRIGGER_CLASSNAME, SPACE_TRIGGER_WIDTH_CLASSNAME)}>
                <SelectValue>
                  <SpaceValue space={currentSpace} />
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <SpaceItem />
                </SelectItem>
                {spaceTags?.map((item) => (
                  <SelectItem key={item.id} value={item.id.toString()}>
                    <SpaceItem space={item} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className={cn(STRIP_TRIGGER_CLASSNAME, SPACE_TRIGGER_WIDTH_CLASSNAME, 'flex items-center justify-between gap-2')}>
              <SpaceValue space={currentSpace} />
            </div>
          )
        ) : null}

        {showTags ? (
          onTagAdd && onTagRemove ? (
            <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    TAG_BUTTON_CLASSNAME,
                    'shrink-0 whitespace-nowrap',
                    tagPopoverOpen && 'bg-white/95 text-foreground shadow-[0_2px_10px_rgba(0,0,0,0.05)]',
                  )}
                >
                  标签{selectedTagIds.length > 0 ? ` (${selectedTagIds.length})` : ''}
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="start"
                sideOffset={14}
                className="w-[340px] rounded-[16px] border-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.42)] p-[16px_18px] text-foreground shadow-[0_4px_24px_rgba(0,0,0,0.06)] backdrop-blur-[20px]"
              >
                <TagInput
                  applicableTo="question"
                  selectedTags={selectedTagIds.map((id) => ({ id }))}
                  onAdd={onTagAdd}
                  onRemove={onTagRemove}
                  extendScope={false}
                />
              </PopoverContent>
            </Popover>
          ) : (
            <div className={cn(TAG_BUTTON_CLASSNAME, 'shrink-0 whitespace-nowrap')}>
              标签{selectedTagIds.length > 0 ? ` (${selectedTagIds.length})` : ''}
            </div>
          )
        ) : null}
      </div>

      {trailingContent ? (
        <div className="flex shrink-0 items-center gap-2">
          {trailingContent}
        </div>
      ) : null}
    </div>
  );
};
