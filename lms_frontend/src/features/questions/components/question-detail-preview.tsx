import React from 'react';

import type { Question } from '@/types/question';
import { cn } from '@/lib/utils';

import { QuestionDocumentReadMode } from './question-document-read-mode';

interface QuestionDetailPreviewProps {
  question: Question;
  className?: string;
  saving?: boolean;
  onSaveContent?: (content: string) => Promise<void> | void;
  onSaveExplanation?: (explanation: string) => Promise<void> | void;
  onSaveOption?: (index: number, value: string) => Promise<void> | void;
}

type EditingField = 'content' | 'explanation' | `option:${number}` | null;

export const QuestionDetailPreview: React.FC<QuestionDetailPreviewProps> = ({
  question,
  className,
  saving = false,
  onSaveContent,
  onSaveExplanation,
  onSaveOption,
}) => {
  const [editingField, setEditingField] = React.useState<EditingField>(null);
  const options = question.options ?? [];

  React.useEffect(() => {
    setEditingField(null);
  }, [question.id, question.updated_at]);

  const commitEditing = async (
    field: Exclude<EditingField, null>,
    nextValue: string,
    currentValue: string,
  ) => {
    const normalized = nextValue.trim();
    if (normalized === currentValue.trim()) {
      setEditingField(null);
      return;
    }

    if (field === 'content') {
      if (onSaveContent) {
        await onSaveContent(normalized);
      }
      setEditingField(null);
      return;
    }

    if (field === 'explanation') {
      if (onSaveExplanation) {
        await onSaveExplanation(normalized);
      }
      setEditingField(null);
      return;
    }

    const index = Number(field.split(':')[1]);
    if (!Number.isNaN(index) && onSaveOption) {
      await onSaveOption(index, normalized);
    }
    setEditingField(null);
  };

  const cancelEditing = (element: HTMLDivElement, value: string) => {
    element.textContent = value;
    setEditingField(null);
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
      await commitEditing(field, event.currentTarget.textContent ?? '', value);
      event.currentTarget.blur();
      return;
    }

    if (!multiline && event.key === 'Enter') {
      event.preventDefault();
      await commitEditing(field, event.currentTarget.textContent ?? '', value);
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
    placeholder: string,
    textClassName: string,
    multiline = false,
  ) => (
    <div
      contentEditable
      suppressContentEditableWarning
      onFocus={() => setEditingField(field)}
      onBlur={(event) => { void commitEditing(field, event.currentTarget.textContent ?? '', value); }}
      onKeyDown={(event) => { void handleKeyDown(event, field, value, multiline); }}
      className={cn(
        'block w-full min-w-0 max-w-full bg-transparent outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#9aa6b2]',
        'whitespace-pre-wrap break-all cursor-text',
        textClassName,
        editingField === field && 'text-foreground',
      )}
      data-placeholder={placeholder}
    >
      {value}
    </div>
  );

  return (
    <QuestionDocumentReadMode
      mode="preview"
      className={cn('w-full rounded-none border-0 bg-transparent', className)}
      compactWidth={720}
      saving={saving}
      questionType={question.question_type}
      content={question.content}
      options={options}
      answer={question.answer ?? ''}
      explanation={question.explanation ?? ''}
      showExplanation
      contentRenderer={({ value, placeholder, className: textClassName }) => (
        renderEditableText('content', value, placeholder, textClassName, true)
      )}
      explanationRenderer={({ value, placeholder, className: textClassName }) => (
        <div className="rounded-xl bg-muted/30 px-4 py-3">
          {renderEditableText('explanation', value, placeholder, textClassName, true)}
        </div>
      )}
      optionLabelRenderer={(option, index) => (
        renderEditableText(
          `option:${index}`,
          option.value || '',
          '未填写选项内容',
          'flex min-h-[20px] items-center whitespace-pre-wrap break-words text-[14px] leading-[1.35] text-foreground',
        )
      )}
    />
  );
};
