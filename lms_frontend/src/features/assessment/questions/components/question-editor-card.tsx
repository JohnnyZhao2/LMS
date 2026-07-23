import React from 'react';
import { Loader2, Save, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CompactNumberInput } from '@/components/ui/compact-number-input';
import { QUIET_OUTLINE_FIELD_CLASSNAME } from '@/components/ui/interactive-styles';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  getQuestionTypePresentation,
  normalizeQuestionTypeFields,
  QUESTION_TYPE_PICKER_OPTIONS,
} from '@/features/assessment/questions/config';
import { QuestionAnswer } from '@/features/assessment/questions/components/question-answer';
import { QuestionDocumentDivider } from '@/features/assessment/questions/components/question-document-shared';
import { useQuestionDocumentSplitLayout } from '@/features/assessment/questions/editor-utils';
import type { AssessmentTagDeps } from '@/features/assessment/types/tag-deps';
import { richTextToPlainText } from '@/lib/rich-text';
import { cn } from '@/lib/utils';
import type { QuestionType, SimpleTag, Tag } from '@/types/common';

export interface QuestionEditorCardValue {
  questionId: number | null;
  questionType: QuestionType;
  spaceTagId?: number | null;
  content: string;
  options: Array<{ key: string; value: string }>;
  answer: string | string[];
  explanation: string;
  showExplanation: boolean;
  score: string;
  tagIds?: number[];
}

interface QuestionEditorCardProps {
  item: QuestionEditorCardValue;
  spaceTags?: Tag[];
  TagInput: AssessmentTagDeps['TagInput'];
  showScore?: boolean;
  lockQuestionType?: boolean;
  onChange: (patch: Partial<QuestionEditorCardValue>) => void;
  onDelete?: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  isDeleting?: boolean;
  headerActions?: React.ReactNode;
  className?: string;
}

type MetaSpaceTag = Pick<SimpleTag, 'id' | 'name' | 'color'>;

const META_FIELD_CLASSNAME = 'h-7 rounded-md border-none bg-[color:color-mix(in_oklab,var(--color-primary-50)_68%,white)] text-[11px] font-medium shadow-none';
const STRIP_TRIGGER_CLASSNAME = `${QUIET_OUTLINE_FIELD_CLASSNAME} ${META_FIELD_CLASSNAME} px-2.5`;
const TAG_BUTTON_CLASSNAME = 'inline-flex h-7 items-center rounded-full border-[1.5px] border-black/8 bg-white/70 px-3 text-[10.5px] font-semibold tracking-[-0.01em] text-text-muted shadow-none backdrop-blur-[6px] transition-all';
const META_SELECT_TRIGGER_CLASSNAME = 'relative justify-start gap-0 pr-8 [&>svg]:pointer-events-none [&>svg]:absolute [&>svg]:right-2.5 [&>svg]:top-1/2 [&>svg]:-translate-y-1/2';
const META_SELECT_VALUE_CLASSNAME = '[&>span]:flex [&>span]:w-full [&>span]:min-w-0 [&>span]:items-center [&>span]:overflow-visible [&>span]:whitespace-nowrap';
const META_SEGMENT_LAYOUT_CLASSNAME = 'grid w-full grid-cols-[auto_1px_minmax(0,1fr)] items-center gap-2';
const META_SEGMENT_RIGHT_CLASSNAME = 'flex min-w-0 items-center justify-center text-center';
const TYPE_TRIGGER_WIDTH_CLASSNAME = 'w-[108px]';
const SCORE_TRIGGER_WIDTH_CLASSNAME = 'w-[96px]';
const SPACE_TRIGGER_WIDTH_CLASSNAME = 'w-[108px]';

const getSpaceAccentColor = (space?: MetaSpaceTag | null) =>
  space?.color || 'color-mix(in oklab, var(--color-text-muted) 46%, white)';
const EMPTY_SPACE_ACCENT_COLOR = 'color-mix(in oklab, var(--color-text-muted) 36%, white)';

const MetaSegmentField: React.FC<{
  leading: React.ReactNode;
  trailing: React.ReactNode;
}> = ({ leading, trailing }) => (
  <span className={META_SEGMENT_LAYOUT_CLASSNAME}>
    <span className="inline-flex items-center justify-center">{leading}</span>
    <span className="h-3.5 w-px shrink-0 bg-foreground/16" aria-hidden="true" />
    <span className={META_SEGMENT_RIGHT_CLASSNAME}>
      {trailing}
    </span>
  </span>
);

const TypeValue: React.FC<{ type: QuestionType }> = ({ type }) => {
  const { icon: Icon, label, color } = getQuestionTypePresentation(type);

  return (
    <MetaSegmentField
      leading={(
        <span className={cn('inline-flex h-4 w-4 shrink-0 items-center justify-center', color)}>
          <Icon className="h-3 w-3 shrink-0" strokeWidth={2.2} />
        </span>
      )}
      trailing={(
        <span className="truncate text-[10.5px] font-semibold leading-[1.1] tracking-[-0.01em] text-text-muted">
          {label}
        </span>
      )}
    />
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
  <MetaSegmentField
    leading={(
      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
        <span
          className="inline-flex h-3 w-3 shrink-0 rounded-full border-[1.5px]"
          style={{ borderColor: space ? getSpaceAccentColor(space) : EMPTY_SPACE_ACCENT_COLOR }}
          aria-hidden="true"
        />
      </span>
    )}
    trailing={space ? (
      <span className="truncate text-[10.5px] font-semibold leading-[1.1] tracking-[-0.01em] text-text-muted">
        {space.name}
      </span>
    ) : (
      <span className="text-[10.5px] font-semibold leading-[1.1] tracking-[-0.01em] text-text-muted" aria-hidden="true">
        ___
      </span>
    )}
  />
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

/**
 * 题目编辑卡片：元信息工具栏 + 题干/答案分区 + 解析与保存删除操作。
 */
export const QuestionEditorCard: React.FC<QuestionEditorCardProps> = ({
  item,
  spaceTags,
  TagInput,
  showScore = false,
  lockQuestionType,
  onChange,
  onDelete,
  onSave,
  isSaving = false,
  isDeleting = false,
  headerActions,
  className,
}) => {
  const { rootRef, isCompact, splitLayoutStyle, dividerPositionStyle, startResize } =
    useQuestionDocumentSplitLayout();
  const [isExplanationPopoverOpen, setIsExplanationPopoverOpen] = React.useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = React.useState(false);

  const plainExplanation = richTextToPlainText(item.explanation || '').trim();
  const isChoiceType = item.questionType === 'SINGLE_CHOICE' || item.questionType === 'MULTIPLE_CHOICE';
  const staticType = lockQuestionType ?? !!item.questionId;
  const currentSpace = spaceTags?.find((space) => space.id === item.spaceTagId) ?? null;
  const selectedTagIds = item.tagIds ?? [];

  React.useEffect(() => {
    if (!item.showExplanation) {
      setIsExplanationPopoverOpen(false);
    }
  }, [item.showExplanation]);

  const footerActions = (headerActions || onDelete || onSave) ? (
    <div className="flex items-center gap-2.5">
      {headerActions}
      {onDelete ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-none border-none bg-transparent p-0 text-destructive shadow-none hover:bg-transparent hover:text-destructive/85"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          disabled={isDeleting || isSaving}
          aria-label="删除"
          title="删除"
        >
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      ) : null}
      {onSave ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-none border-none bg-transparent p-0 text-primary-600 shadow-none hover:bg-transparent hover:text-primary-500"
          onClick={(event) => {
            event.stopPropagation();
            onSave();
          }}
          disabled={isDeleting || isSaving}
          aria-label="保存"
          title="保存"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        </Button>
      ) : null}
    </div>
  ) : null;

  return (
    <div
      ref={rootRef}
      className={cn('overflow-hidden rounded-xl border border-border bg-background', className)}
    >
      <div className="border-b border-border px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto">
            {staticType ? (
              <div className={cn(STRIP_TRIGGER_CLASSNAME, TYPE_TRIGGER_WIDTH_CLASSNAME, 'flex items-center justify-start gap-0')}>
                <TypeValue type={item.questionType} />
              </div>
            ) : (
              <Select
                value={item.questionType}
                onValueChange={(value) => {
                  const nextType = value as QuestionType;
                  const normalized = normalizeQuestionTypeFields({
                    options: item.options,
                    answer: item.answer,
                  }, nextType);

                  onChange({
                    questionType: nextType,
                    options: normalized.options ?? item.options,
                    answer: normalized.answer ?? item.answer,
                  });
                }}
              >
                <SelectTrigger className={cn(
                  STRIP_TRIGGER_CLASSNAME,
                  TYPE_TRIGGER_WIDTH_CLASSNAME,
                  META_SELECT_TRIGGER_CLASSNAME,
                  META_SELECT_VALUE_CLASSNAME,
                )}
                >
                  <SelectValue>
                    <TypeValue type={item.questionType} />
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
            )}

            {showScore ? (
              <CompactNumberInput
                prefixLabel="分值"
                mode="integer"
                value={item.score}
                onChange={(value) => onChange({ score: value })}
                min={0}
                max={100}
                step={1}
                prefixClassName="whitespace-nowrap text-text-muted !text-[10.5px]"
                inputWidthClassName="w-10"
                inputClassName="!text-[10.5px] leading-none !text-text-muted"
                className={`${SCORE_TRIGGER_WIDTH_CLASSNAME} ${META_FIELD_CLASSNAME}`}
              />
            ) : null}

            <Select
              value={item.spaceTagId == null ? '__none__' : String(item.spaceTagId)}
              onValueChange={(value) => onChange({ spaceTagId: value === '__none__' ? null : Number(value) })}
            >
              <SelectTrigger className={cn(
                STRIP_TRIGGER_CLASSNAME,
                SPACE_TRIGGER_WIDTH_CLASSNAME,
                META_SELECT_TRIGGER_CLASSNAME,
                META_SELECT_VALUE_CLASSNAME,
              )}
              >
                <SelectValue>
                  <SpaceValue space={currentSpace} />
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <SpaceItem />
                </SelectItem>
                {spaceTags?.map((space) => (
                  <SelectItem key={space.id} value={space.id.toString()}>
                    <SpaceItem space={space} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
                  onAdd={(tag) => onChange({
                    tagIds: [...new Set([...selectedTagIds, tag.id])],
                  })}
                  onRemove={(tagId) => onChange({
                    tagIds: selectedTagIds.filter((id) => id !== tagId),
                  })}
                  extendScope={false}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div
        className={cn('relative grid px-5 py-3', isCompact ? 'grid-cols-1 gap-4' : '')}
        style={splitLayoutStyle}
      >
        <div className={cn('min-w-0', isCompact ? '' : 'pr-5')}>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            题干
          </div>
          <Textarea
            autoResize
            interactionStyle="minimal"
            value={item.content}
            onChange={(event) => onChange({ content: event.target.value })}
            rows={2}
            className="min-h-[56px] resize-none border-none bg-transparent px-0 py-0 text-[15px] font-medium leading-7 shadow-none focus-visible:ring-0"
          />
        </div>

        <div className={cn('min-w-0', isCompact ? '' : 'pl-5')}>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            {isChoiceType ? '选项' : '参考答案'}
          </div>
          <QuestionAnswer
            mode="edit"
            questionType={item.questionType}
            options={item.options}
            answer={item.answer}
            onOptionsChange={(value) => onChange({ options: value })}
            onAnswerChange={(value) => onChange({ answer: value })}
          />
        </div>

        <QuestionDocumentDivider
          isCompact={isCompact}
          dividerPositionStyle={dividerPositionStyle}
          resizable
          onResizeStart={startResize}
        />
      </div>

      <div className="border-t border-border px-5 py-1.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-text-muted">
              答案解析
            </div>
            <button
              type="button"
              role="switch"
              aria-label="切换答案解析"
              aria-checked={item.showExplanation}
              onClick={() => {
                const nextShowExplanation = !item.showExplanation;
                if (!nextShowExplanation) {
                  onChange({ showExplanation: false, explanation: '' });
                  setIsExplanationPopoverOpen(false);
                  return;
                }
                onChange({ showExplanation: true });
                setIsExplanationPopoverOpen(true);
              }}
              className="inline-flex items-center self-center"
            >
              <span
                className={cn(
                  'relative inline-flex h-3.5 w-6 shrink-0 rounded-full transition-colors',
                  item.showExplanation
                    ? 'bg-primary-500/80'
                    : 'bg-[color:color-mix(in_oklab,var(--color-primary-100)_58%,white)]',
                )}
              >
                <span
                  className={cn(
                    'absolute left-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-background shadow-[0_1px_3px_rgba(15,23,42,0.18)] transition-transform',
                    item.showExplanation && 'translate-x-2.5',
                  )}
                />
              </span>
            </button>
            {item.showExplanation ? (
              <Popover open={isExplanationPopoverOpen} onOpenChange={setIsExplanationPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="text-[12px] font-medium text-primary-600 transition-colors hover:text-primary-500"
                  >
                    {plainExplanation ? '编辑解析' : '配置解析'}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  side="top"
                  sideOffset={12}
                  className="w-[420px] border-none bg-transparent p-0 shadow-none"
                >
                  <Textarea
                    autoResize
                    interactionStyle="minimal"
                    value={item.explanation}
                    onChange={(event) => onChange({ explanation: event.target.value })}
                    rows={6}
                    placeholder="填写答案解析"
                    className="min-h-[144px] resize-none rounded-[16px] border-border bg-background px-4 py-3 text-[14px] leading-7 shadow-[0_18px_48px_rgba(15,23,42,0.14)] focus-visible:ring-0"
                  />
                </PopoverContent>
              </Popover>
            ) : null}
          </div>

          {footerActions}
        </div>
      </div>
    </div>
  );
};
