import React from 'react';
import { ChevronDown } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getQuestionTypePresentation, QUESTION_TYPE_PICKER_OPTIONS } from '@/features/questions/constants';
import { CompactNumberInput } from '@/features/quiz-center/quizzes/components/compact-number-input';
import { cn } from '@/lib/utils';
import type { QuestionType } from '@/types/api';

import { AnswerInput, OptionsInput } from './question-form-inputs';

const PANEL_SECTION_LABEL_CLASSNAME = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground';
const PANEL_SECTION_STACK_CLASSNAME = 'space-y-2.5';

const DEFAULT_CHOICE_OPTIONS = [
  { key: 'A', value: '' },
  { key: 'B', value: '' },
  { key: 'C', value: '' },
  { key: 'D', value: '' },
];

export const ensureChoiceOptions = (options?: Array<{ key: string; value: string }>) => {
  const existing = options ?? [];
  if (existing.length >= 4) {
    return existing;
  }
  return [
    ...existing,
    ...DEFAULT_CHOICE_OPTIONS.slice(existing.length).map((option) => ({ ...option })),
  ];
};

const QuestionTypeCompactContent: React.FC<{
  type: QuestionType;
  withDivider?: boolean;
}> = ({ type, withDivider = true }) => {
  const { icon: Icon, label, color } = getQuestionTypePresentation(type);

  return (
    <span className="inline-flex items-center justify-center gap-1.5">
      <span className={cn('inline-flex h-4 w-4 shrink-0 items-center justify-center', color)}>
        <Icon className="h-3 w-3 shrink-0" strokeWidth={2.2} />
      </span>
      {withDivider && <div className="h-3 w-px shrink-0 bg-foreground/16" />}
      <span className="text-[10.5px] font-medium tracking-[-0.01em] text-text-muted">
        {label}
      </span>
    </span>
  );
};

const QuestionTypeSelectItemContent: React.FC<{
  type: QuestionType;
}> = ({ type }) => {
  const { icon: Icon, label, color } = getQuestionTypePresentation(type);

  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className={cn('inline-flex h-5 w-5 shrink-0 items-center justify-center', color)}>
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
      </span>
      <span className="h-3.5 w-px shrink-0 bg-border/80" aria-hidden="true" />
      <span className="truncate text-[12.5px] font-semibold tracking-[-0.01em] text-foreground/88">
        {label}
      </span>
    </span>
  );
};

const QuestionTypeSelectTriggerValue: React.FC<{
  type: QuestionType;
}> = ({ type }) => {
  const { icon: Icon, label, color } = getQuestionTypePresentation(type);

  return (
    <span className="flex h-full min-w-0 flex-1 items-center">
      <span className="inline-flex h-full w-full min-w-0 items-center leading-none">
        <span className={cn('inline-flex h-4 w-4 shrink-0 items-center justify-center', color)}>
          <Icon className="h-3 w-3 shrink-0" strokeWidth={2.2} />
        </span>
        <span className="ml-1 h-3 w-px shrink-0 bg-foreground/16" aria-hidden="true" />
        <span className="ml-1.5 truncate text-[10.5px] font-semibold leading-none tracking-[-0.01em] text-text-muted">
          {label}
        </span>
        <span className="ml-auto inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-text-muted/62">
          <ChevronDown className="h-3.25 w-3.25 shrink-0" strokeWidth={2.2} />
        </span>
      </span>
    </span>
  );
};

interface QuestionDocumentBodyProps {
  questionType: QuestionType;
  content: string;
  options: Array<{ key: string; value: string }>;
  answer: string | string[];
  explanation: string;
  showExplanation: boolean;
  readOnly?: boolean;
  staticType?: boolean;
  showScore?: boolean;
  score?: string;
  onQuestionTypeChange?: (value: QuestionType) => void;
  onContentChange: (value: string) => void;
  onOptionsChange: (value: Array<{ key: string; value: string }>) => void;
  onAnswerChange: (value: string | string[]) => void;
  onExplanationChange: (value: string) => void;
  onShowExplanationChange: (show: boolean) => void;
  onScoreChange?: (value: string) => void;
  headerSuffix?: React.ReactNode;
  middleSection?: React.ReactNode;
}

export const QuestionDocumentBody: React.FC<QuestionDocumentBodyProps> = ({
  questionType,
  content,
  options,
  answer,
  explanation,
  showExplanation,
  readOnly = false,
  staticType = false,
  showScore = false,
  score = '1',
  onQuestionTypeChange,
  onContentChange,
  onOptionsChange,
  onAnswerChange,
  onExplanationChange,
  onShowExplanationChange,
  onScoreChange,
  headerSuffix,
  middleSection,
}) => {
  const isChoiceType = questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE';
  const answerSectionTitle = isChoiceType ? '选项' : '参考答案';

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex items-center gap-3 bg-transparent px-5 pb-3.5 pt-5">
        <div className="flex flex-1 items-center gap-3">
          {staticType ? (
            <div className="flex h-7 items-center justify-center rounded-md bg-[color:color-mix(in_oklab,var(--color-primary-50)_68%,white)] px-3 py-1">
              <QuestionTypeCompactContent type={questionType} />
            </div>
          ) : (
            <div className="flex h-7 items-center">
              <Select
                value={questionType}
                onValueChange={(value) => onQuestionTypeChange?.(value as QuestionType)}
              >
                <SelectTrigger
                  disabled={readOnly}
                  className="h-7 w-[92px] shrink-0 rounded-md border-none bg-[color:color-mix(in_oklab,var(--color-primary-50)_68%,white)] px-2 text-[11.5px] font-semibold leading-none tracking-[-0.01em] shadow-none ring-0 focus-visible:ring-0 data-[state=open]:ring-0 [&>svg]:hidden"
                >
                  <QuestionTypeSelectTriggerValue type={questionType} />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPE_PICKER_OPTIONS.map(({ value }) => (
                    <SelectItem key={value} value={value}>
                      <QuestionTypeSelectItemContent type={value} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {showScore && onScoreChange && (
            <CompactNumberInput
              prefixLabel="分值"
              mode="integer"
              value={score}
              onChange={onScoreChange}
              min={0}
              max={100}
              step={1}
              prefixClassName="text-text-muted !text-[10.5px]"
              inputWidthClassName="w-8"
              inputClassName="!text-[10.5px] leading-none !text-text-muted"
              className="h-7 w-[92px] gap-1.5 rounded-md bg-[color:color-mix(in_oklab,var(--color-primary-50)_68%,white)] px-2 py-1"
            />
          )}
        </div>

        {headerSuffix}
      </div>

      <div className="mx-5 h-px bg-[color:color-mix(in_oklab,var(--color-primary-100)_52%,var(--color-border))]" />

      <div className="space-y-3.5 px-5 pb-0 pt-3.5">
        <section className={PANEL_SECTION_STACK_CLASSNAME}>
          <Label className={PANEL_SECTION_LABEL_CLASSNAME}>
            题目内容
          </Label>
          <Textarea
            autoResize
            interactionStyle="minimal"
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            rows={1}
            readOnly={readOnly}
            className="min-h-[40px] resize-none rounded-lg border border-transparent bg-interaction-surface-strong px-3 py-2.5 text-[15px] font-semibold leading-6 text-foreground shadow-none transition-[border-color,box-shadow,background-color,color] duration-200 hover:border-transparent hover:bg-interaction-surface-strong focus:outline-none focus:border-primary-300 focus:bg-interaction-surface-strong focus:shadow-[inset_0_0_0_1px_var(--theme-interaction-outline)]"
          />
        </section>

        <section className={PANEL_SECTION_STACK_CLASSNAME}>
          <div className="flex items-center justify-between gap-3">
            <Label className={PANEL_SECTION_LABEL_CLASSNAME}>
              {answerSectionTitle}
            </Label>
            <div className="flex items-center gap-2">
              <span className={PANEL_SECTION_LABEL_CLASSNAME}>
                答案解析
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={showExplanation}
                disabled={readOnly}
                onClick={() => {
                  if (readOnly) return;
                  onShowExplanationChange(!showExplanation);
                }}
                className={cn(
                  'relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors',
                  readOnly && 'cursor-default opacity-70',
                  showExplanation ? 'bg-primary-500/80' : 'bg-[color:color-mix(in_oklab,var(--color-primary-100)_58%,white)]',
                )}
              >
                <span
                  className={cn(
                    'absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-background shadow-[0_1px_3px_rgba(15,23,42,0.18)] transition-transform',
                    showExplanation && 'translate-x-3',
                  )}
                />
              </button>
            </div>
          </div>
          {isChoiceType ? (
            <OptionsInput
              questionType={questionType}
              value={options}
              onChange={onOptionsChange}
              answer={answer}
              onAnswerChange={onAnswerChange}
              disabled={readOnly}
            />
          ) : (
            <AnswerInput
              questionType={questionType}
              options={options}
              value={answer}
              onChange={onAnswerChange}
              disabled={readOnly}
            />
          )}
        </section>

        <div className="space-y-3.5 border-t border-border/70 pt-3.5">
          {middleSection}

          {showExplanation ? (
            <section className={PANEL_SECTION_STACK_CLASSNAME}>
              <div className={PANEL_SECTION_LABEL_CLASSNAME}>
                答案解析
              </div>
              <Textarea
                autoResize
                interactionStyle="minimal"
                value={explanation}
                onChange={(e) => onExplanationChange(e.target.value)}
                rows={1}
                readOnly={readOnly}
                className="min-h-[24px] resize-none rounded-lg border border-transparent bg-interaction-surface-strong px-3 py-2.5 text-[13px] leading-6 text-foreground shadow-none transition-[border-color,box-shadow,background-color,color] duration-200 hover:border-transparent hover:bg-interaction-surface-strong focus:outline-none focus:border-primary-300 focus:bg-interaction-surface-strong focus:shadow-[inset_0_0_0_1px_var(--theme-interaction-outline)]"
              />
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
};
