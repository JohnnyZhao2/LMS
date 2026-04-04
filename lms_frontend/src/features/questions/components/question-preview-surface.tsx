import React from 'react';

import { cn } from '@/lib/utils';
import { richTextToPlainText } from '@/lib/rich-text';
import type { Question } from '@/types/api';

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

const typeLabelMap: Record<Question['question_type'], string> = {
  SINGLE_CHOICE: '单选题',
  MULTIPLE_CHOICE: '多选题',
  TRUE_FALSE: '判断题',
  SHORT_ANSWER: '简答题',
};

export const QuestionPreviewSurface: React.FC<QuestionPreviewSurfaceProps> = ({
  question,
  className,
  editable = false,
  saving = false,
  onSaveContent,
  onSaveExplanation,
  onSaveOption,
}) => {
  const answers = Array.isArray(question.answer) ? question.answer : [question.answer].filter(Boolean);
  const options = question.options ?? [];
  const plainContent = richTextToPlainText(question.content || '');
  const explanation = question.explanation?.trim() ?? '';
  const [editingField, setEditingField] = React.useState<EditingField>(null);
  const draftRef = React.useRef('');

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

  const cancelEditing = (
    element: HTMLDivElement,
    value: string,
  ) => {
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
          'w-full bg-transparent outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#9aa6b2]',
          options?.multiline
            ? cn('whitespace-pre-wrap break-words', isEditing && 'min-h-[84px]')
            : 'whitespace-pre-wrap break-words',
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
        <div className="rounded-[10px] border border-[#d9e2ec] bg-[#f8fafc] px-5 py-4 text-[14px] leading-7 text-[#5b6878]">
          <div className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-[#9aa6b2]">参考答案</div>
          <div className="text-[14px] leading-7 text-[#5b6878]">
            {String(question.answer || '').trim() || '暂无参考答案'}
          </div>
        </div>
      );
    }

    if (question.question_type === 'TRUE_FALSE') {
      const items = [
        { key: 'TRUE', label: '正确' },
        { key: 'FALSE', label: '错误' },
      ];

      return (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => {
            const selected = answers.includes(item.key);
            return (
              <div
                key={item.key}
                className={cn(
                  'flex items-center justify-center rounded-[10px] border px-4 py-3 text-[14px] font-medium transition-colors',
                  selected
                    ? 'border-primary-300 bg-primary-50 text-primary-700'
                    : 'border-[#dde5ee] bg-[#f8fafc] text-[#526277]',
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
      <div className="space-y-2">
        {options.map((option, index) => {
          const selected = answers.includes(option.key);
          return (
            <div
              key={option.key}
              className={cn(
                'flex items-center gap-3 rounded-[10px] border px-4 py-3 transition-colors',
                selected
                  ? 'border-primary-300 bg-primary-50/80'
                  : 'border-[#e2e8f0] bg-[#f8fafc]',
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold',
                  selected
                    ? 'border-primary-500 bg-primary-500 text-white'
                    : 'border-[#cbd5e1] bg-white text-[#64748b]',
                )}
              >
                {option.key}
              </span>
              <div className="min-w-0 flex-1">
                {renderEditableText(`option:${index}`, option.value || '', {
                  displayClassName: 'text-[14px] leading-6 text-[#334155]',
                  inputClassName: 'text-[14px] leading-6 text-[#334155]',
                  placeholder: '未填写选项内容',
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={cn('mx-auto flex w-full max-w-[860px] flex-col gap-8', className)}>
      <section className="space-y-5">
        <div className="flex items-center justify-between border-b border-[#e8edf3] pb-3">
          <div className="text-[12px] font-semibold tracking-[0.08em] text-[#8b97a6]">
            {typeLabelMap[question.question_type]}
          </div>
          <div className="text-[13px] font-medium text-[#9aa6b2]">{question.score || '0'} 分</div>
        </div>

        <div className={cn(saving && 'opacity-70')}>
          {renderEditableText('content', plainContent, {
            multiline: true,
            displayClassName: 'text-[18px] font-semibold leading-8 tracking-[-0.015em] text-[#1f2937]',
            inputClassName: 'text-[18px] font-semibold leading-8 tracking-[-0.015em] text-[#1f2937]',
            placeholder: '暂无题目内容',
          })}
        </div>

        <div>{renderOptions()}</div>
      </section>

      <section className="border-t border-[#e8edf3] pt-6">
        <div className="mb-3 text-[12px] font-semibold tracking-[0.06em] text-[#8b97a6]">考点解析</div>
        <div className="rounded-[10px] border border-[#e2e8f0] bg-[#fbfcfd] px-5 py-4 text-[14px] leading-7 text-[#64748b]">
          {renderEditableText('explanation', explanation, {
            multiline: true,
            displayClassName: 'text-[14px] leading-7 text-[#64748b]',
            inputClassName: 'text-[14px] leading-7 text-[#64748b]',
            placeholder: '暂无考点解析',
          })}
        </div>
      </section>
    </div>
  );
};
