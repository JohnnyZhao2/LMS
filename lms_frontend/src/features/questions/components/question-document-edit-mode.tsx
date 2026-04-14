import React from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { richTextToPlainText } from '@/lib/rich-text';
import { cn } from '@/lib/utils';

import { QuestionDocumentAnswerEditor } from './question-document-answer-panels';
import { QuestionDocumentDivider } from './question-document-shared';
import type { QuestionDocumentBodyProps } from './question-document-types';
import { useQuestionDocumentSplitLayout } from './question-document-utils';

type QuestionDocumentEditModeProps = Omit<QuestionDocumentBodyProps, 'mode' | 'response' | 'score' | 'questionNumber'>;

export const QuestionDocumentEditMode: React.FC<QuestionDocumentEditModeProps> = ({
  className,
  metaBar,
  footerActions,
  questionType,
  content,
  options,
  answer,
  explanation,
  showExplanation,
  readOnly = false,
  onContentChange,
  onOptionsChange,
  onAnswerChange,
  onExplanationChange,
  onShowExplanationChange,
}) => {
  const { rootRef, isCompact, splitLayoutStyle, dividerPositionStyle, startResize } =
    useQuestionDocumentSplitLayout();
  const [isExplanationPopoverOpen, setIsExplanationPopoverOpen] = React.useState(false);
  const plainExplanation = richTextToPlainText(explanation || '').trim();
  const isChoiceType = questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE';

  React.useEffect(() => {
    if (!showExplanation) {
      setIsExplanationPopoverOpen(false);
    }
  }, [showExplanation]);

  const explanationToggle = onShowExplanationChange ? (
    <button
      type="button"
      role="switch"
      aria-label="切换答案解析"
      aria-checked={showExplanation}
      disabled={readOnly}
      onClick={() => {
        if (readOnly) {
          return;
        }
        const nextShowExplanation = !showExplanation;
        onShowExplanationChange(nextShowExplanation);
        setIsExplanationPopoverOpen(nextShowExplanation);
      }}
      className="inline-flex items-center self-center"
    >
      <span
        className={cn(
          'relative inline-flex h-3.5 w-6 shrink-0 rounded-full transition-colors',
          readOnly && 'cursor-default opacity-70',
          showExplanation
            ? 'bg-primary-500/80'
            : 'bg-[color:color-mix(in_oklab,var(--color-primary-100)_58%,white)]',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-background shadow-[0_1px_3px_rgba(15,23,42,0.18)] transition-transform',
            showExplanation && 'translate-x-2.5',
          )}
        />
      </span>
    </button>
  ) : null;

  const explanationTrigger = showExplanation ? (
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
          value={explanation}
          onChange={(event) => onExplanationChange?.(event.target.value)}
          rows={6}
          readOnly={readOnly}
          placeholder="填写答案解析"
          className="min-h-[144px] resize-none rounded-[16px] border-border bg-background px-4 py-3 text-[14px] leading-7 shadow-[0_18px_48px_rgba(15,23,42,0.14)] focus-visible:ring-0"
        />
      </PopoverContent>
    </Popover>
  ) : null;

  return (
    <div
      ref={rootRef}
      className={cn('overflow-hidden rounded-xl border border-border bg-background', className)}
    >
      {metaBar ? <div className="border-b border-border px-5 py-3">{metaBar}</div> : null}

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
            value={content}
            onChange={(event) => onContentChange?.(event.target.value)}
            rows={2}
            readOnly={readOnly}
            className="min-h-[56px] resize-none border-none bg-transparent px-0 py-0 text-[15px] font-medium leading-7 shadow-none focus-visible:ring-0"
          />
        </div>

        <div className={cn('min-w-0', isCompact ? '' : 'pl-5')}>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            {isChoiceType ? '选项' : '参考答案'}
          </div>
          <QuestionDocumentAnswerEditor
            questionType={questionType}
            options={options}
            answer={answer}
            readOnly={readOnly}
            onOptionsChange={onOptionsChange}
            onAnswerChange={onAnswerChange}
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
            {explanationToggle}
            {explanationTrigger}
          </div>

          {footerActions ? <div className="flex items-center gap-2">{footerActions}</div> : null}
        </div>
      </div>
    </div>
  );
};
