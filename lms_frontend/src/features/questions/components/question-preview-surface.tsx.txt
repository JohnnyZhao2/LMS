import React from 'react';

import { richTextToPlainText } from '@/lib/rich-text';
import { cn } from '@/lib/utils';
import type { Question } from '@/types/api';

import {
  QuestionChoiceRow,
  QuestionDocumentDivider,
} from './question-document-shared';
import {
  QUESTION_TRUE_FALSE_ITEMS,
  normalizeQuestionValueToArray,
  useQuestionDocumentSplitLayout,
} from './question-document-utils';

interface QuestionPreviewSurfaceProps {
  question: Question;
  className?: string;
  editable?: boolean;
  saving?: boolean;
  onSaveContent?: (content: string) => Promise<void> | void;
  onSaveExplanation?: (explanation: string) => Promise<void> | void;
  onSaveOption?: (index: number, value: string) => Promise<void> | void;
}

type EditingField = 'content' | 'explanation' | `option:${number}` | null;

export const QuestionPreviewSurface: React.FC<QuestionPreviewSurfaceProps> = ({
  question,
  className,
  editable = false,
  saving = false,
  onSaveContent,
  onSaveExplanation,
  onSaveOption,
}) => {
  const { rootRef, isCompact, splitLayoutStyle, dividerPositionStyle, startResize } =
    useQuestionDocumentSplitLayout(720);
  const answers = normalizeQuestionValueToArray(question.answer, question.question_type);
  const options = question.options ?? [];
  const plainContent = richTextToPlainText(question.content || '');
  const explanation = question.explanation?.trim() ?? '';
  const [editingField, setEditingField] = React.useState<EditingField>(null);
  const draftRef = React.useRef('');
  const isChoiceType = question.question_type === 'SINGLE_CHOICE' || question.question_type === 'MULTIPLE_CHOICE';

  React.useEffect(() => {
    setEditingField(null);
    draftRef.current = '';
  }, [question.id, question.updated_at]);

  const commitEditing = async (field: Exclude<EditingField, null>, nextValue: string) => {
    const normalized = nextValue.trim();

    if (field === 'content') {
      if (normalized !== plainContent && onSaveContent) {
        await onSaveContent(normalized);
      }
    } else if (field === 'explanation') {
      if (normalized !== explanation && onSaveExplanation) {
        await onSaveExplanation(normalized);
      }
    } else if (field.startsWith('option:')) {
      const index = Number(field.split(':')[1]);
      if (!Number.isNaN(index) && normalized !== (options[index]?.value ?? '') && onSaveOption) {
        await onSaveOption(index, normalized);
      }
    }

    setEditingField(null);
    draftRef.current = '';
  };

  const cancelEditing = (element: HTMLDivElement, value: string) => {
    element.textContent = value;
    setEditingField(null);
    draftRef.current = '';
    if (document.activeElement === element) {
      element.blur();
    }
  };

  const handleKeyDown = async (
    event: React.KeyboardEvent<HTMLDivElement>,
    field: Exclude<EditingField, null>,
    value: string,
    multiline?: boolean,
  ) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      await commitEditing(field, event.currentTarget.textContent ?? '');
      event.currentTarget.blur();
      return;
    }

    if (!multiline && event.key === 'Enter') {
      event.preventDefault();
      await commitEditing(field, event.currentTarget.textContent ?? '');
      event.currentTarget.blur();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditing(event.currentTarget, value);
    }
  };

  const renderEditableText = (
    field: Exclude<EditingField, null>,
    value: string,
    options?: {
      multiline?: boolean;
      inputClassName?: string;
      displayClassName?: string;
      placeholder?: string;
    },
  ) => {
    const isEditing = editingField === field;

    return (
      <div
        contentEditable={editable}
        suppressContentEditableWarning
        onFocus={() => {
          setEditingField(field);
          draftRef.current = value;
        }}
        onBlur={(event) => { void commitEditing(field, event.currentTarget.textContent ?? ''); }}
        onInput={(event) => {
          draftRef.current = event.currentTarget.textContent ?? '';
        }}
        onKeyDown={(event) => { void handleKeyDown(event, field, value, options?.multiline); }}
        className={cn(
          'block w-full min-w-0 max-w-full bg-transparent outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#9aa6b2]',
          'whitespace-pre-wrap break-all',
          isEditing ? options?.inputClassName : options?.displayClassName,
          editable ? 'cursor-text' : 'cursor-default',
        )}
        data-placeholder={options?.placeholder}
      >
        {value}
      </div>
    );
  };

  const renderOptions = () => {
    if (question.question_type === 'SHORT_ANSWER') {
      return (
        <div className="min-h-[190px] rounded-[14px] border border-border bg-background px-4 py-3 text-[14px] leading-6 text-foreground">
          {String(question.answer || '').trim() || '暂无参考答案'}
        </div>
      );
    }

    if (question.question_type === 'TRUE_FALSE') {
      return (
        <div className="space-y-3">
          {QUESTION_TRUE_FALSE_ITEMS.map((item) => {
            const selected = answers.includes(item.key);
            return (
              <div
                key={item.key}
                className={cn(
                  'flex h-[42px] items-center rounded-xl border px-4 text-[14px] font-medium transition-colors',
                  selected
                    ? 'border-primary-300 bg-primary-50 text-primary-700'
                    : 'border-border bg-background text-foreground',
                )}
              >
                {item.label}
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {options.map((option, index) => {
          return (
            <QuestionChoiceRow
              key={option.key}
              optionKey={option.key}
              selected={answers.includes(option.key)}
              label={renderEditableText(`option:${index}`, option.value || '', {
                displayClassName: 'flex min-h-[20px] items-center whitespace-pre-wrap break-words text-[14px] leading-[1.35] text-foreground',
                inputClassName: 'flex min-h-[20px] items-center whitespace-pre-wrap break-words text-[14px] leading-[1.35] text-foreground',
                placeholder: '未填写选项内容',
              })}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        'w-full',
        saving && 'opacity-70',
        className,
      )}
    >
      <div
        className={cn('relative grid', isCompact ? 'grid-cols-1' : '')}
        style={splitLayoutStyle}
      >
        <div className={cn('flex min-h-full min-w-0 flex-col px-5 py-4', isCompact ? '' : 'pr-5')}>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            题干
          </div>
          {renderEditableText('content', plainContent, {
            multiline: true,
            displayClassName: 'min-h-[164px] whitespace-pre-wrap break-words text-[15px] font-semibold leading-7 text-foreground',
            inputClassName: 'min-h-[164px] whitespace-pre-wrap break-words text-[15px] font-semibold leading-7 text-foreground',
            placeholder: '暂无题目内容',
          })}
        </div>

        <div className={cn('min-w-0 px-5 py-4', isCompact ? '' : 'pl-5')}>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            {isChoiceType ? '选项' : '参考答案'}
          </div>
          {renderOptions()}
        </div>

        <QuestionDocumentDivider
          isCompact={isCompact}
          dividerPositionStyle={dividerPositionStyle}
          resizable
          onResizeStart={startResize}
        />
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          答案解析
        </div>
        <div className="rounded-xl bg-muted/30 px-4 py-3">
          {renderEditableText('explanation', explanation, {
            multiline: true,
            displayClassName: 'min-h-[108px] whitespace-pre-wrap break-words text-[14px] leading-7 text-foreground',
            inputClassName: 'min-h-[108px] whitespace-pre-wrap break-words text-[14px] leading-7 text-foreground',
            placeholder: '无解析',
          })}
        </div>
      </div>
    </div>
  );
};
