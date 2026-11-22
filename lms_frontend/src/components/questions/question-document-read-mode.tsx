import React from 'react';

import { richTextToPlainText } from '@/lib/rich-text';
import { formatScore } from '@/lib/score';
import { cn } from '@/lib/utils';

import { QuestionDocumentResponsePanel } from './question-document-answer-panels';
import type { QuestionDocumentBodyProps } from './question-document-types';

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
> & {
  headerActions?: React.ReactNode;
  explanationLayout?: 'inline' | 'bottom';
};

export const QuestionDocumentReadMode: React.FC<QuestionDocumentReadModeProps> = ({
  mode = 'preview',
  className,
  headerActions,
  footerActions,
  explanationLayout = 'inline',
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
  const isAnswerMode = mode === 'answer';
  const isChoiceType = questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE';
  const plainContent = richTextToPlainText(content || '').trim();
  const plainExplanation = richTextToPlainText(explanation || '').trim();
  const showBottomExplanation = !isAnswerMode && showExplanation && explanationLayout === 'bottom';
  const showInlineExplanation = !isAnswerMode && showExplanation && explanationLayout !== 'bottom';
  const previewContentMinHeightClass = showInlineExplanation
    ? 'min-h-[56px] @min-[700px]:min-h-[120px]'
    : 'min-h-[56px] @min-[700px]:min-h-[164px]';
  const contentClassName = 'whitespace-pre-wrap break-words text-[15px] font-medium leading-7 text-foreground';
  const explanationClassName = 'min-h-[108px] whitespace-pre-wrap break-words text-[14px] leading-7 text-foreground';
  const explanationContent = (
    <div className="mt-3 rounded-[14px] border border-border bg-muted/20 px-4 py-3">
      <div className={explanationClassName}>
        {plainExplanation || '暂无答案解析'}
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        '@container overflow-hidden rounded-xl border border-border bg-background',
        className,
      )}
    >
      <div className="flex flex-col">
        <div
          className="relative grid grid-cols-1 @min-[700px]:grid-cols-[46%_minmax(0,1fr)]"
        >
          <div className="flex min-h-full min-w-0 flex-col px-5 py-4 @min-[700px]:pr-5">
            <div className={cn(previewContentMinHeightClass)}>
              {questionNumber ? (
                <div className="mb-2 flex items-center justify-between gap-3 text-[13px] font-semibold leading-5 text-text-muted">
                  <div className="flex items-center gap-3.5">
                    <span className="tabular-nums">第 {questionNumber} 题</span>
                    {score != null ? <span className="shrink-0 tabular-nums">{formatScore(score)} 分</span> : null}
                  </div>
                  {headerActions}
                </div>
              ) : null}
              <div className={contentClassName}>
                {plainContent || '暂无题目内容'}
              </div>
            </div>

            {showInlineExplanation ? (
              <div className="mt-auto border-t border-border pt-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                  答案解析
                </div>
                {explanationContent}
              </div>
            ) : null}
          </div>

          <div className="min-w-0 px-5 py-4 @min-[700px]:pl-5">
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

          <div className="absolute inset-y-0 left-[46%] hidden w-px bg-border @min-[700px]:block" aria-hidden="true" />
        </div>

        {showBottomExplanation ? (
          <div className="border-t border-border px-5 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              答案解析
            </div>
            {explanationContent}
          </div>
        ) : null}
      </div>

      {footerActions ? (
        <div className="flex justify-end border-t border-border px-5 py-3">
          {footerActions}
        </div>
      ) : null}
    </div>
  );
};
