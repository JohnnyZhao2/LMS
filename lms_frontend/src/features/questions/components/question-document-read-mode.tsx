import React from 'react';

import { richTextToPlainText } from '@/lib/rich-text';
import { cn } from '@/lib/utils';

import { QuestionDocumentResponsePanel } from './question-document-answer-panels';
import { QuestionDocumentDivider } from './question-document-shared';
import type { QuestionDocumentBodyProps } from './question-document-types';
import { useQuestionDocumentSplitLayout } from './question-document-utils';

type QuestionDocumentReadModeProps = Pick<
  QuestionDocumentBodyProps,
  | 'mode'
  | 'className'
  | 'footerActions'
  | 'score'
  | 'questionType'
  | 'content'
  | 'options'
  | 'answer'
  | 'response'
  | 'explanation'
  | 'showExplanation'
  | 'disabled'
  | 'questionNumber'
  | 'onResponseChange'
>;

export const QuestionDocumentReadMode: React.FC<QuestionDocumentReadModeProps> = ({
  mode = 'preview',
  className,
  footerActions,
  score,
  questionType,
  content,
  options,
  answer,
  response,
  explanation,
  showExplanation,
  disabled = false,
  questionNumber,
  onResponseChange,
}) => {
  const { rootRef, isCompact, splitLayoutStyle, dividerPositionStyle, startResize } =
    useQuestionDocumentSplitLayout();
  const isAnswerMode = mode === 'answer';
  const isChoiceType = questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE';
  const plainContent = richTextToPlainText(content || '').trim();
  const plainExplanation = richTextToPlainText(explanation || '').trim();
  const previewContentMinHeightClass = isCompact
    ? 'min-h-[56px]'
    : showExplanation
      ? 'min-h-[120px]'
      : 'min-h-[164px]';

  return (
    <div
      ref={rootRef}
      className={cn('overflow-hidden rounded-xl border border-border bg-background', className)}
    >
      <div
        className={cn('relative grid', isCompact ? 'grid-cols-1' : '')}
        style={splitLayoutStyle}
      >
        <div className={cn('flex min-h-full min-w-0 flex-col px-5 py-4', isCompact ? '' : 'pr-5')}>
          <div className={cn(previewContentMinHeightClass)}>
            {questionNumber ? (
              <div className="mb-2 flex items-center justify-between gap-3 text-[12px] font-medium text-text-muted">
                <span>第 {questionNumber} 题</span>
                {score != null ? <span className="shrink-0">{String(score)} 分</span> : null}
              </div>
            ) : null}
            <div className="whitespace-pre-wrap break-words text-[15px] font-semibold leading-7 text-foreground">
              {plainContent || '暂无题目内容'}
            </div>
          </div>

          {!isAnswerMode && showExplanation ? (
            <div className="mt-auto border-t border-border pt-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                答案解析
              </div>
              <div className="mt-3 min-h-[108px] whitespace-pre-wrap break-words rounded-[14px] border border-border bg-muted/20 px-4 py-3 text-[14px] leading-7 text-foreground">
                {plainExplanation || '暂无答案解析'}
              </div>
            </div>
          ) : null}
        </div>

        <div className={cn('min-w-0 px-5 py-4', isCompact ? '' : 'pl-5')}>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            {isChoiceType ? '选项' : (isAnswerMode ? '作答区域' : '参考答案')}
          </div>
          <QuestionDocumentResponsePanel
            questionType={questionType}
            options={options}
            answer={answer}
            response={response}
            disabled={disabled}
            interactive={isAnswerMode}
            onResponseChange={onResponseChange}
          />
        </div>

        <QuestionDocumentDivider
          isCompact={isCompact}
          dividerPositionStyle={dividerPositionStyle}
          resizable
          onResizeStart={startResize}
        />
      </div>

      {footerActions ? (
        <div className="flex justify-end border-t border-border px-5 py-3">
          {footerActions}
        </div>
      ) : null}
    </div>
  );
};
